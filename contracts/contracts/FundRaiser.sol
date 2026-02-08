// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FundRaiser is ReentrancyGuard, Ownable {
    // ─── Types ───────────────────────────────────────────────────────────
    enum Status { Active, Successful, Failed, Rugged }

    struct Campaign {
        address creator;
        string  username;       // Twitter handle
        uint256 bondAmount;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 deadline;
        Status  status;
    }

    // ─── State ───────────────────────────────────────────────────────────
    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) internal _funders;

    mapping(address => bool)   public eligible;      // TwitterScore whitelist
    mapping(address => int256) public reputation;

    // ─── Events ──────────────────────────────────────────────────────────
    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string  username,
        uint256 bondAmount,
        uint256 targetAmount,
        uint256 deadline
    );

    event CampaignFunded(
        uint256 indexed id,
        address indexed funder,
        uint256 amount
    );

    event CampaignFinalized(
        uint256 indexed id,
        Status  status
    );

    event ReputationUpdated(
        address indexed wallet,
        int256  newScore
    );

    event EligibilitySet(
        address indexed wallet,
        bool    status
    );

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Admin ───────────────────────────────────────────────────────────
    function setEligible(address wallet, bool status) external onlyOwner {
        eligible[wallet] = status;
        emit EligibilitySet(wallet, status);
    }

    // ─── Campaign lifecycle ──────────────────────────────────────────────

    /// @notice Create a campaign. msg.value = bond amount.
    function createCampaign(
        string calldata username,
        uint256 targetAmount,
        uint256 durationSeconds
    ) external payable returns (uint256) {
        require(eligible[msg.sender], "Not eligible (TwitterScore)");
        require(msg.value > 0, "Bond must be > 0");
        require(targetAmount > 0, "Target must be > 0");
        require(durationSeconds >= 1 hours, "Min duration 1 hour");

        uint256 id = campaignCount++;

        campaigns[id] = Campaign({
            creator:      msg.sender,
            username:     username,
            bondAmount:   msg.value,
            targetAmount: targetAmount,
            raisedAmount: 0,
            deadline:     block.timestamp + durationSeconds,
            status:       Status.Active
        });

        emit CampaignCreated(id, msg.sender, username, msg.value, targetAmount, block.timestamp + durationSeconds);
        return id;
    }

    /// @notice Fund an active campaign.
    function fundCampaign(uint256 id) external payable nonReentrant {
        Campaign storage c = campaigns[id];
        require(c.status == Status.Active, "Campaign not active");
        require(block.timestamp < c.deadline, "Campaign expired");
        require(msg.value > 0, "Must send funds");

        if (contributions[id][msg.sender] == 0) {
            _funders[id].push(msg.sender);
        }

        contributions[id][msg.sender] += msg.value;
        c.raisedAmount += msg.value;

        emit CampaignFunded(id, msg.sender, msg.value);
    }

    /// @notice Creator finalizes as success or fail. Owner can mark as rugged.
    function finalizeCampaign(uint256 id, Status newStatus) external nonReentrant {
        Campaign storage c = campaigns[id];
        require(c.status == Status.Active, "Already finalized");
        require(
            newStatus == Status.Successful ||
            newStatus == Status.Failed ||
            newStatus == Status.Rugged,
            "Invalid status"
        );

        if (newStatus == Status.Rugged) {
            require(msg.sender == owner(), "Only owner can rug-flag");
        } else {
            require(
                msg.sender == c.creator || msg.sender == owner(),
                "Only creator or owner"
            );
        }

        c.status = newStatus;

        if (newStatus == Status.Successful) {
            // Release raised funds + bond to creator
            uint256 payout = c.raisedAmount + c.bondAmount;
            c.raisedAmount = 0;
            c.bondAmount = 0;
            (bool ok, ) = c.creator.call{value: payout}("");
            require(ok, "Transfer failed");

            reputation[c.creator] += 1;
            emit ReputationUpdated(c.creator, reputation[c.creator]);
        } else if (newStatus == Status.Failed) {
            // Return bond to creator (funders claim refunds individually)
            uint256 bond = c.bondAmount;
            c.bondAmount = 0;
            (bool ok, ) = c.creator.call{value: bond}("");
            require(ok, "Bond return failed");
        } else {
            // Rugged: slash bond (stays in contract / sent to owner), funders can refund
            uint256 slashedBond = c.bondAmount;
            c.bondAmount = 0;
            (bool ok, ) = owner().call{value: slashedBond}("");
            require(ok, "Slash transfer failed");

            reputation[c.creator] -= 2;
            emit ReputationUpdated(c.creator, reputation[c.creator]);
        }

        emit CampaignFinalized(id, newStatus);
    }

    /// @notice Funders can claim refund if campaign failed or rugged.
    function claimRefund(uint256 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        require(
            c.status == Status.Failed || c.status == Status.Rugged,
            "Refund not available"
        );

        uint256 amount = contributions[id][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[id][msg.sender] = 0;
        c.raisedAmount -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Refund failed");
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getCampaign(uint256 id)
        external
        view
        returns (
            address creator,
            string memory username,
            uint256 bondAmount,
            uint256 targetAmount,
            uint256 raisedAmount,
            uint256 deadline,
            Status  status
        )
    {
        Campaign storage c = campaigns[id];
        return (c.creator, c.username, c.bondAmount, c.targetAmount, c.raisedAmount, c.deadline, c.status);
    }

    function getReputation(address wallet) external view returns (int256) {
        return reputation[wallet];
    }

    function getFunders(uint256 id) external view returns (address[] memory) {
        return _funders[id];
    }

    function getContribution(uint256 id, address funder) external view returns (uint256) {
        return contributions[id][funder];
    }
}
