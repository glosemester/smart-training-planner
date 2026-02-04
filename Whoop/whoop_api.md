WHOOP API
Download OpenAPI specification:Download

Authentication
OAuth
Security Scheme Type	OAuth2
authorizationCode OAuth Flow	
Authorization URL: https://api.prod.whoop.com/oauth/oauth2/auth
Token URL: https://api.prod.whoop.com/oauth/oauth2/token
Scopes:
read:recovery - Read Recovery data, including score, heart rate variability, and resting heart rate.
read:cycles - Read cycles data, including day Strain and average heart rate during a physiological cycle.
read:workout - Read workout data, including activity Strain and average heart rate.
read:sleep - Read sleep data, including performance % and duration per sleep stage.
read:profile - Read profile data, including name and email.
read:body_measurement - Read body measurements data, including height, weight, and max heart rate.
Activity ID Mapping
Utility endpoints for activity ID mapping

Get V2 UUID for V1 Activity ID
Lookup the V2 UUID for a given V1 activity ID

path Parameters
activityV1Id
required
integer <int64>
Example: 12345678
V1 Activity ID

Responses
200 Successfully retrieved mapping
404 Activity mapping not found
500 Server error

get
/v1/activity-mapping/{activityV1Id}
Response samples
200
Content type
application/json

Copy
{
"v2_activity_id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8"
}
User
Endpoints for retrieving user profile and measurement data.

Get User Body Measurements
Retrieves the body measurements (height, weight, max heart rate) for the authenticated user.

Authorizations:
OAuth (read:body_measurement)
Responses
200 Successfully retrieved body measurements
401 Invalid authorization
404 Requested resource not found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/user/measurement/body
Response samples
200
Content type
application/json

Copy
{
"height_meter": 1.8288,
"weight_kilogram": 90.7185,
"max_heart_rate": 200
}
Get Basic User Profile
Retrieves the basic profile information (name, email) for the authenticated user.

Authorizations:
OAuth (read:profile)
Responses
200 Successfully retrieved user profile
401 Invalid authorization
404 Requested resource not found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/user/profile/basic
Response samples
200
Content type
application/json

Copy
{
"user_id": 10129,
"email": "jsmith123@whoop.com",
"first_name": "John",
"last_name": "Smith"
}
revokeUserOAuthAccess
Revoke the access token granted by the user. If the associated OAuth client is configured to receive webhooks, it will no longer receive them for this user.

Authorizations:
OAuth
Responses
204 Successful request; no response body
400 Client error constructing the request
401 Invalid authorization
429 Request rejected due to rate limiting
500 Server error occurred while making request

delete
/v2/user/access
Cycle
getCycleById
Get the cycle for the specified ID

Authorizations:
OAuth (read:cycles)
path Parameters
cycleId
required
integer <int64>
ID of the cycle to retrieve

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
404 No resource found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/cycle/{cycleId}
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"id": 93845,
"user_id": 10129,
"created_at": "2022-04-24T11:25:44.774Z",
"updated_at": "2022-04-24T14:25:44.774Z",
"start": "2022-04-24T02:25:44.774Z",
"end": "2022-04-24T10:25:44.774Z",
"timezone_offset": "-05:00",
"score_state": "SCORED",
"score": {
"strain": 5.2951527,
"kilojoule": 8288.297,
"average_heart_rate": 68,
"max_heart_rate": 141
}
}
getCycleCollection
Get all physiological cycles for a user, paginated. Results are sorted by start time in descending order.

Authorizations:
OAuth (read:cycles)
query Parameters
limit	
integer <int32> <= 25
Default: 10
Limit on the number of cycles returned

start	
string <date-time>
Return cycles that occurred after or during (inclusive) this time. If not specified, the response will not filter cycles by a minimum time.

end	
string <date-time>
Return cycles that intersect this time or ended before (exclusive) this time. If not specified, end will be set to now.

nextToken	
string
Optional next token from the previous response to get the next page. If not provided, the first page in the collection is returned

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/cycle
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"records": [
{}
],
"next_token": "MTIzOjEyMzEyMw"
}
getSleepForCycle
Get the sleep for the specified cycle ID

path Parameters
cycleId
required
integer <int64>
ID of the cycle to retrieve sleep for

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
404 No resource found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/cycle/{cycleId}/sleep
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
"cycle_id": 93845,
"v1_id": 93845,
"user_id": 10129,
"created_at": "2022-04-24T11:25:44.774Z",
"updated_at": "2022-04-24T14:25:44.774Z",
"start": "2022-04-24T02:25:44.774Z",
"end": "2022-04-24T10:25:44.774Z",
"timezone_offset": "-05:00",
"nap": false,
"score_state": "SCORED",
"score": {
"stage_summary": {},
"sleep_needed": {},
"respiratory_rate": 16.11328125,
"sleep_performance_percentage": 98,
"sleep_consistency_percentage": 90,
"sleep_efficiency_percentage": 91.69533848
}
}
Recovery
getRecoveryCollection
Get all recoveries for a user, paginated. Results are sorted by start time of the related sleep in descending order.

Authorizations:
OAuth (read:recovery)
query Parameters
limit	
integer <int32> <= 25
Default: 10
Limit on the number of recoveries returned

start	
string <date-time>
Return recoveries that occurred after or during (inclusive) this time. If not specified, the response will not filter recoveries by a minimum time.

end	
string <date-time>
Return recoveries that intersect this time or ended before (exclusive) this time. If not specified, end will be set to now.

nextToken	
string
Optional next token from the previous response to get the next page. If not provided, the first page in the collection is returned

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/recovery
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"records": [
{}
],
"next_token": "MTIzOjEyMzEyMw"
}
getRecoveryForCycle
Get the recovery for a cycle

Authorizations:
OAuth (read:recovery)
path Parameters
cycleId
required
integer <int64>
ID of the cycle to retrieve

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
404 No resource found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/cycle/{cycleId}/recovery
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"cycle_id": 93845,
"sleep_id": "123e4567-e89b-12d3-a456-426614174000",
"user_id": 10129,
"created_at": "2022-04-24T11:25:44.774Z",
"updated_at": "2022-04-24T14:25:44.774Z",
"score_state": "SCORED",
"score": {
"user_calibrating": false,
"recovery_score": 44,
"resting_heart_rate": 64,
"hrv_rmssd_milli": 31.813562,
"spo2_percentage": 95.6875,
"skin_temp_celsius": 33.7
}
}
Sleep
getSleepById
Get the sleep for the specified ID

Authorizations:
OAuth (read:sleep)
path Parameters
sleepId
required
string <uuid>
ID of the sleep to retrieve

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
404 No resource found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/activity/sleep/{sleepId}
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
"cycle_id": 93845,
"v1_id": 93845,
"user_id": 10129,
"created_at": "2022-04-24T11:25:44.774Z",
"updated_at": "2022-04-24T14:25:44.774Z",
"start": "2022-04-24T02:25:44.774Z",
"end": "2022-04-24T10:25:44.774Z",
"timezone_offset": "-05:00",
"nap": false,
"score_state": "SCORED",
"score": {
"stage_summary": {},
"sleep_needed": {},
"respiratory_rate": 16.11328125,
"sleep_performance_percentage": 98,
"sleep_consistency_percentage": 90,
"sleep_efficiency_percentage": 91.69533848
}
}
getSleepCollection
Get all sleeps for a user, paginated. Results are sorted by start time in descending order.

Authorizations:
OAuth (read:sleep)
query Parameters
limit	
integer <int32> <= 25
Default: 10
Limit on the number of sleeps returned

start	
string <date-time>
Return sleeps that occurred after or during (inclusive) this time. If not specified, the response will not filter sleeps by a minimum time.

end	
string <date-time>
Return sleeps that intersect this time or ended before (exclusive) this time. If not specified, end will be set to now.

nextToken	
string
Optional next token from the previous response to get the next page. If not provided, the first page in the collection is returned

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/activity/sleep
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"records": [
{}
],
"next_token": "MTIzOjEyMzEyMw"
}
Workout
getWorkoutById
Get the workout for the specified ID

Authorizations:
OAuth (read:workout)
path Parameters
workoutId
required
string <uuid>
ID of the workout to retrieve

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
404 No resource found
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/activity/workout/{workoutId}
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
"v1_id": 1043,
"user_id": 9012,
"created_at": "2022-04-24T11:25:44.774Z",
"updated_at": "2022-04-24T14:25:44.774Z",
"start": "2022-04-24T02:25:44.774Z",
"end": "2022-04-24T10:25:44.774Z",
"timezone_offset": "-05:00",
"sport_name": "running",
"score_state": "SCORED",
"score": {
"strain": 8.2463,
"average_heart_rate": 123,
"max_heart_rate": 146,
"kilojoule": 1569.34033203125,
"percent_recorded": 100,
"distance_meter": 1772.77035916,
"altitude_gain_meter": 46.64384460449,
"altitude_change_meter": -0.781372010707855,
"zone_durations": {}
},
"sport_id": 1
}
getWorkoutCollection
Get all workouts for a user, paginated. Results are sorted by start time in descending order.

Authorizations:
OAuth (read:workout)
query Parameters
limit	
integer <int32> <= 25
Default: 10
Limit on the number of workouts returned

start	
string <date-time>
Return workouts that occurred after or during (inclusive) this time. If not specified, the response will not filter workouts by a minimum time.

end	
string <date-time>
Return workouts that intersect this time or ended before (exclusive) this time. If not specified, end will be set to now.

nextToken	
string
Optional next token from the previous response to get the next page. If not provided, the first page in the collection is returned

Responses
200 Successful request
400 Client error constructing the request
401 Invalid authorization
429 Request rejected due to rate limiting
500 Server error occurred while making request

get
/v2/activity/workout
Response samples
200
Content type
application/json

Copy
Expand allCollapse all
{
"records": [
{}
],
"next_token": "MTIzOjEyMzEyMw"
}