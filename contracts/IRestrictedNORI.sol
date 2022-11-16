// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface IRestrictedNORI {
  /**
   * @notice Check the existence of a schedule.
   * @param scheduleId The token ID of the schedule for which to check existence.
   * @return Returns a boolean indicating whether or not the schedule exists.
   */
  function scheduleExists(uint256 scheduleId) external view returns (bool);

  /**
   * @notice Sets up a restriction schedule with parameters determined from the project ID.
   * @dev Create a schedule for a project ID and set the parameters of the schedule.
   *
   * @param projectId The ID that will be used as this schedule's token ID
   * @param startTime The schedule's start time in seconds since the unix epoch
   * @param methodology The methodology of this project, used to look up correct schedule duration
   * @param methodologyVersion The methodology version, used to look up correct schedule duration
   */
  function createSchedule(
    uint256 projectId,
    uint256 startTime,
    uint8 methodology,
    uint8 methodologyVersion
  ) external;

  /**
   * @notice Revokes amount of tokens from the specified project (schedule) ID and transfers to `toAccount`.
   * @dev The behavior of this function can be used in two specific ways:
   * 1. To revoke a specific number of tokens as specified by the `amount` parameter.
   * 2. To revoke all remaining revokable tokens in a schedule by specifying 0 as the `amount`.
   *
   * Transfers any unreleased tokens in the specified schedule and reduces the total supply
   * of that token. Only unreleased tokens can be revoked from a schedule and no change is made to
   * balances that have released but not yet been claimed.
   * If a token has multiple owners, balances are burned proportionally to ownership percentage,
   * summing to the total amount being revoked.
   * Once the tokens have been revoked, the current released amount can never fall below
   * its current level, even if the linear release schedule of the new amount would cause
   * the released amount to be lowered at the current timestamp (a floor is established).
   *
   * Unlike in the `withdrawFromSchedule` function, here we burn RestrictedNORI
   * from the schedule owner but send that underlying ERC20 token back to Nori's
   * treasury or an address of Nori's choosing (the `toAccount` address).
   * The `claimedAmount` is not changed because this is not a claim operation.
   *
   * Emits a `TokensRevoked` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `TOKEN_REVOKER_ROLE` role.
   * - The requirements of `_beforeTokenTransfer` apply to this function.
   * @param projectId The schedule ID from which to revoke tokens.
   * @param amount The amount to revoke.
   * @param toAccount The account to which the underlying ERC20 token should be sent.
   */
  function revokeUnreleasedTokens(
    uint256 projectId,
    uint256 amount,
    address toAccount
  ) external;

  /**
   * @notice Get the current number of revocable tokens for a given schedule at the current block timestamp.
   * @param scheduleId The schedule ID for which to revoke tokens.
   * @return Returns the number of revocable tokens for a given schedule at the current block timestamp.
   */
  function revocableQuantityForSchedule(uint256 scheduleId)
    external
    view
    returns (uint256);
}
