buses

users


i havee 2 collections , in the users collection i have 3 users . sepeareted by role 

this is example of admin : 

createdAt
"2025-07-03T23:27:49.391Z"
(string)


email
"adsasda2@gmail.com"
(string)


name
"adsad"
(string)


role
"admin"
(string)


uid
"57I7SZQ7KGcIrv1cJzBWk7PIOGb2"




this is exmample of rider:

accountStatus
"pending_verification"
(string)


address
"DeirAmes"
(string)



busAssignments
(array)



0
(map)


assignedAt
"2025-07-03T19:34:48.061Z"
(string)


busId
"6cxS0mA0PNlLmGIOSqul"
(string)


endDate
"2025-08-03T19:34:48.062Z"
(string)



locationId
(array)


0
"Al-Aabbassiyah"
(string)


paymentStatus
"pending"
(string)


qrCode
"{"userId":"6oT7JyYE2tPOx428P7JFrJq9XWm2","busId":"6cxS0mA0PNlLmGIOSqul","subscriptionId":"sub_1751571288061_oz0h498qn","timestamp":1751571288061,"type":"bus_subscription"}"
(string)


startDate
"2025-07-03T19:34:48.061Z"
(string)


status
"active"
(string)


subscriberEmail
"alishehab149@gmail.com"
(string)


subscriberName
"Ali Shehab 11"
(string)


subscriptionId
"sub_1751571288061_oz0h498qn"
(string)


subscriptionType
"monthly"
(string)


updatedAt
"2025-07-03T19:39:03.118Z"
(string)



1
(map)


assignedAt
"2025-07-05T17:33:43.181Z"
(string)


busId
"0qAULpkHvSEGZFK9IEt1"
(string)



locationId
(array)


0
"Deir Aames"
(string)


1
"Tyre"
(string)


paymentStatus
"pending"
(string)


qrCode
"{"userId":"6oT7JyYE2tPOx428P7JFrJq9XWm2","busId":"0qAULpkHvSEGZFK9IEt1","subscriptionId":"sub_1751736823176_afenmb26s","timestamp":1751736823180,"type":"bus_subscription"}"
(string)


startDate
"2025-07-05T17:33:43.181Z"
(string)


status
"active"
(string)


subscriberEmail
"alishehab149@gmail.com"
(string)


subscriberName
"Ali Shehab 313"
(string)


subscriptionId
"sub_1751736823176_afenmb26s"
(string)


subscriptionType
"per_ride"
(string)


updatedAt
"2025-07-05T17:34:27.845Z"
(string)


createdAt
"2025-07-03T19:33:50.064Z"
(string)


email
"alishehab149@gmail.com"
(string)


emailVerified
false
(Boolean)


emergencyContact
"14141414"
(string)


name
"Ali Shehab 313"
(string)


phoneNumber
"78944248"
(string)


role
"rider"
(string)


uid
"6oT7JyYE2tPOx428P7JFrJq9XWm2"
(string)


updatedAt
5 July 2025 at 20:34:30 UTC+3





and this is example of driver:

address
"Aaytit"
(string)



busAssignments
(array)


0
"0qAULpkHvSEGZFK9IEt1"
(string)


createdAt
5 July 2025 at 20:14:52 UTC+3
(timestamp)


email
"shehabali567@gmail.com"
(string)


licenseNumber
"12345678910"
(string)


name
"hajj yousef"
(string)


phoneNumber
"70196174"
(string)


role
"driver"
(string)


uid
"V826wD9WISPCah7m6A635gttG5s2"
(string)


updatedAt
5 July 2025 at 20:32:40 UTC+3






and this is an example of buses collection : 


busLabel
""
(string)


busName
"hajj usef"
(string)


createdAt
5 July 2025 at 20:29:11 UTC+3
(timestamp)



currentRiders
(array)



0
(map)


email
"alishehab149@gmail.com"
(string)


id
"6oT7JyYE2tPOx428P7JFrJq9XWm2"
(string)


name
"Ali Shehab 313"
(string)


paymentStatus
"unpaid"
(string)


subscriptionType
"per_ride"
(string)


driverId
"V826wD9WISPCah7m6A635gttG5s2"
(string)


driverName
"hajj yousef"
(string)



locations
(array)



0
(map)



address
(map)


city
"Deir Aames"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"08:00"
(string)


arrivalTimeTo
"08:20"
(string)


latitude
33.23
(number)


longitude
35.28
(number)


name
"Deir Aames"
(string)


order
0
(number)


placeId
"deir-aames"
(string)



1
(map)



address
(map)


city
"Qana"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"08:30"
(string)


arrivalTimeTo
"09:00"
(string)


latitude
33.21
(number)


longitude
35.31
(number)


name
"Qana"
(string)


order
1
(number)


placeId
"qana"
(string)



2
(map)



address
(map)


city
"Hannaouiyah"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"09:20"
(string)


arrivalTimeTo
"09:50"
(string)


latitude
33.23
(number)


longitude
35.31
(number)


name
"Hannaouiyah"
(string)


order
2
(number)


placeId
"hannaouiyah"
(string)



3
(map)



address
(map)


city
"Burj ash-Shamali"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"10:00"
(string)


arrivalTimeTo
"10:20"
(string)


latitude
33.28
(number)


longitude
35.21
(number)


name
"Burj ash-Shamali"
(string)


order
3
(number)


placeId
"burj-ash-shamali"
(string)



4
(map)



address
(map)


city
"Tyre"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"10:30"
(string)


arrivalTimeTo
"11:00"
(string)


latitude
33.2707
(number)


longitude
35.2038
(number)


name
"Tyre"
(string)


order
4
(number)


placeId
"tyre-center"
(string)



5
(map)



address
(map)


city
"Tyre"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"14:00"
(string)


arrivalTimeTo
"14:05"
(string)


latitude
33.2707
(number)


longitude
35.2038
(number)


name
"Tyre"
(string)


order
5
(number)


placeId
"tyre-center"
(string)



6
(map)



address
(map)


city
"Burj ash-Shamali"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"14:30"
(string)


arrivalTimeTo
"15:00"
(string)


latitude
33.28
(number)


longitude
35.21
(number)


name
"Burj ash-Shamali"
(string)


order
6
(number)


placeId
"burj-ash-shamali"
(string)



7
(map)



address
(map)


city
"Hannaouiyah"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"15:20"
(string)


arrivalTimeTo
"15:50"
(string)


latitude
33.23
(number)


longitude
35.31
(number)


name
"Hannaouiyah"
(string)


order
7
(number)


placeId
"hannaouiyah"
(string)



8
(map)



address
(map)


city
"Qana"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"16:20"
(string)


arrivalTimeTo
"16:30"
(string)


latitude
33.21
(number)


longitude
35.31
(number)


name
"Qana"
(string)


order
8
(number)


placeId
"qana"
(string)



9
(map)



address
(map)


city
"Deir Aames"
(string)


country
"Lebanon"
(string)


district
"Tyre"
(string)


governorate
"South Lebanon"
(string)


arrivalTimeFrom
"16:50"
(string)


arrivalTimeTo
"17:00"
(string)


latitude
33.23
(number)


longitude
35.28
(number)


name
"Deir Aames"
(string)


order
9
(number)


placeId
"deir-aames"
(string)


maxCapacity
15
(number)


operatingTimeFrom
"08:00"
(string)


operatingTimeTo
"17:00"
(string)


pricePerMonth
100
(number)


pricePerRide
5
(number)



subscribers
(array)


updatedAt
"2025-07-05T17:38:08.860Z"
(string)



workingDays
(map)


monday
true
(Boolean)


thursday
true
(Boolean)


tuesday
true
(Boolean)


wednesday
true

