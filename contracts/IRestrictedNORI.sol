// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface IRestrictedNORI {
  /**
   * @notice Sets up a restriction schedule with parameters determined from the project ID.
   * @dev Create a schedule for a project ID and set the parameters of the schedule.
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
   * @notice Check the existence of a schedule.
   * @param scheduleId The token ID of the schedule for which to check existence.
   * @return Returns a boolean indicating whether or not the schedule exists.
   */
  function scheduleExists(uint256 scheduleId) external view returns (bool);
}
