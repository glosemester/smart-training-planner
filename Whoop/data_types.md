Cycle
The human body undergoes a biological rhythm of asleep, awake, asleep, awake. We often think of one repetition within a calendar day, such as Tuesday, April 19, 2022. However, calendar days and sleep patterns don't always align. Some people work when other people are sleeping. Some people don't go to sleep for at least 24 hours.

We always reference a member's activity in the context of a Physiological Cycle (known as Cycle for short) rather than calendar days. When you request a member's latest Cycle, the member's current Cycle will only have a Start Time. Cycles in the past have both a start and end time.

Data Model
id
required
integer <int64>
Unique identifier for the physiological cycle

user_id
required
integer <int64>
The WHOOP User for the physiological cycle

created_at
required
string <date-time>
The time the cycle was recorded in WHOOP

updated_at
required
string <date-time>
The time the cycle was last updated in WHOOP

start
required
string <date-time>
Start time bound of the cycle

end	
string <date-time>
End time bound of the cycle. If not present, the user is currently in this cycle

timezone_offset
required
string
The user's timezone offset at the time the cycle was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'.

Learn more about the Time Zone Designator from the W3C Standard
score_state
required
string
Enum: "SCORED" "PENDING_SCORE" "UNSCORABLE"
SCORED means the cycle was scored and the measurement values will be present. PENDING_SCORE means WHOOP is currently evaluating the cycle. UNSCORABLE means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range.

score	
object (CycleScore)
WHOOP's measurements and evaluation of the cycle. Only present if the score state is SCORED


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
}Sleep
WHOOP tracks a member's sleep performance. You can view details and measurements about sleep.

Note: In addition to the sleep activity that starts a Cycle, a member can also take naps throughout the Cycle. WHOOP sets the field nap to true on a Sleep that is a Nap. Naps reduce the amount of sleep needed by a member for the next Cycle.

Data Model
id
required
string <uuid>
Unique identifier for the sleep activity

cycle_id
required
integer <int64>
Unique identifier for the cycle this sleep belongs to

v1_id	
integer <int64>
Previous generation identifier for the activity. Will not exist past 09/01/2025

user_id
required
integer <int64>
The WHOOP User who performed the sleep activity

created_at
required
string <date-time>
The time the sleep activity was recorded in WHOOP

updated_at
required
string <date-time>
The time the sleep activity was last updated in WHOOP

start
required
string <date-time>
Start time bound of the sleep

end
required
string <date-time>
End time bound of the sleep

timezone_offset
required
string
The user's timezone offset at the time the sleep was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'.

Learn more about the Time Zone Designator from the W3C Standard
nap
required
boolean
If true, this sleep activity was a nap for the user

score_state
required
string
Enum: "SCORED" "PENDING_SCORE" "UNSCORABLE"
SCORED means the sleep activity was scored and the measurement values will be present. PENDING_SCORE means WHOOP is currently evaluating the sleep activity. UNSCORABLE means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range.

score	
object (SleepScore)
WHOOP's measurements and evaluation of the sleep activity. Only present if the Sleep State is SCORED


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
}Recovery
WHOOP Recovery is a daily measure of how prepared your body is to perform. When you wake up in the morning, WHOOP calculates a Recovery score as a percentage between 0 - 100%. The higher the score, the more primed your body is to take on Strain that day.

In addition to the WHOOP Recovery score, the Recovery object has objective measurements that factored into the score such as the resting heart rate (RHR), heart rate variability (HRV), and for 4.0 members, blood oxygen (SpO2) and skin temperature.

Data Model
cycle_id
required
integer <int64>
The Recovery represents how recovered the user is for this physiological cycle

sleep_id
required
string <uuid>
ID of the Sleep associated with the Recovery

user_id
required
integer <int64>
The WHOOP User for the recovery

created_at
required
string <date-time>
The time the recovery was recorded in WHOOP

updated_at
required
string <date-time>
The time the recovery was last updated in WHOOP

score_state
required
string
Enum: "SCORED" "PENDING_SCORE" "UNSCORABLE"
SCORED means the recovery was scored and the measurement values will be present. PENDING_SCORE means WHOOP is currently evaluating the cycle. UNSCORABLE means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range.

score	
object (RecoveryScore)
WHOOP's measurements and evaluation of the recovery. Only present if the Recovery State is SCORED


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
Recovery data is available through the Cycle endpoints in the V2 API. See the API documentation for details on accessing recovery information through cycles.Workout
WHOOP keeps track of what type of activity you performed (e.g., Running, Cycling), Strain score, and other physiological measurements such as duration in Heart Rate Zones.

Data Model
id
required
string <uuid>
Unique identifier for the workout activity

v1_id	
integer <int64>
Previous generation identifier for the activity. Will not exist past 09/01/2025

user_id
required
integer <int64>
The WHOOP User who performed the workout

created_at
required
string <date-time>
The time the workout activity was recorded in WHOOP

updated_at
required
string <date-time>
The time the workout activity was last updated in WHOOP

start
required
string <date-time>
Start time bound of the workout

end
required
string <date-time>
End time bound of the workout

timezone_offset
required
string
The user's timezone offset at the time the workout was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'.

Learn more about the Time Zone Designator from the W3C Standard
sport_name
required
string
Name of the WHOOP Sport performed during the workout

score_state
required
string
Enum: "SCORED" "PENDING_SCORE" "UNSCORABLE"
SCORED means the workout activity was scored and the measurement values will be present. PENDING_SCORE means WHOOP is currently evaluating the workout activity. UNSCORABLE means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range.

score	
object (WorkoutScore)
WHOOP's measurements and evaluation of the workout activity. Only present if the Workout State is SCORED

sport_id	
integer <int32>
ID of the WHOOP Sport performed during the workout. Will not exist past 09/01/2025


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
WHOOP Sports
Sport ID	Sport
-1	Activity
0	Running
1	Cycling
16	Baseball
17	Basketball
18	Rowing
19	Fencing
20	Field Hockey
21	Football
22	Golf
24	Ice Hockey
25	Lacrosse
27	Rugby
28	Sailing
29	Skiing
30	Soccer
31	Softball
32	Squash
33	Swimming
34	Tennis
35	Track & Field
36	Volleyball
37	Water Polo
38	Wrestling
39	Boxing
42	Dance
43	Pilates
44	Yoga
45	Weightlifting
47	Cross Country Skiing
48	Functional Fitness
49	Duathlon
51	Gymnastics
52	Hiking/Rucking
53	Horseback Riding
55	Kayaking
56	Martial Arts
57	Mountain Biking
59	Powerlifting
60	Rock Climbing
61	Paddleboarding
62	Triathlon
63	Walking
64	Surfing
65	Elliptical
66	Stairmaster
70	Meditation
71	Other
73	Diving
74	Operations - Tactical
75	Operations - Medical
76	Operations - Flying
77	Operations - Water
82	Ultimate
83	Climber
84	Jumping Rope
85	Australian Football
86	Skateboarding
87	Coaching
88	Ice Bath
89	Commuting
90	Gaming
91	Snowboarding
92	Motocross
93	Caddying
94	Obstacle Course Racing
95	Motor Racing
96	HIIT
97	Spin
98	Jiu Jitsu
99	Manual Labor
100	Cricket
101	Pickleball
102	Inline Skating
103	Box Fitness
104	Spikeball
105	Wheelchair Pushing
106	Paddle Tennis
107	Barre
108	Stage Performance
109	High Stress Work
110	Parkour
111	Gaelic Football
112	Hurling/Camogie
113	Circus Arts
121	Massage Therapy
123	Strength Trainer
125	Watching Sports
126	Assault Bike
127	Kickboxing
128	Stretching
230	Table Tennis
231	Badminton
232	Netball
233	Sauna
234	Disc Golf
235	Yard Work
236	Air Compression
237	Percussive Massage
238	Paintball
239	Ice Skating
240	Handball
248	F45 Training
249	Padel
250	Barry's
251	Dedicated Parenting
252	Stroller Walking
253	Stroller Jogging
254	Toddlerwearing
255	Babywearing
258	Barre3
259	Hot Yoga
261	Stadium Steps
262	Polo
263	Musical Performance
264	Kite Boarding
266	Dog Walking
267	Water Skiing
268	Wakeboarding
269	Cooking
270	Cleaning
272	Public SpeakingUser
Basic Profile
Profile information about the user, such as their email and name.

Data Model
user_id
required
integer <int64>
The WHOOP User

email
required
string
User's Email

first_name
required
string
User's First Name

last_name
required
string
User's Last Name


Copy
{
"user_id": 10129,
"email": "jsmith123@whoop.com",
"first_name": "John",
"last_name": "Smith"
}
Body Measurements
Body measurements about the user, such as their weight and height.

Data Model
height_meter
required
number <float>
User's height in meters

weight_kilogram
required
number <float>
User's weight in kilograms

max_heart_rate
required
integer <int32>
The max heart rate WHOOP calculated for the user

WHOOP Locker: Understanding Max Heart Rate and Why It Matters for Training

Copy
{
"height_meter": 1.8288,
"weight_kilogram": 90.7185,
"max_heart_rate": 200
}
