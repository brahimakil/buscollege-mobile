Database Schema and Sample Data
This document outlines the structure and provides sample data for the buses and users collections.

1. Buses Collection
This collection stores all information related to individual bus routes, including their schedule, locations, capacity, and assigned driver.

Sample Document (buses):

{
  "busLabel": "testing 2",
  "busName": "testing 2",
  "createdAt": "5 June 2025 at 06:08:54 UTC-7", // (timestamp)
  "currentRiders": [], // (array)
  "driverId": "qiAbNEiKRfMzrxgA5DYtlh9A7Q73",
  "driverName": "ali",
  "locations": [ // (array of maps)
    {
      "address": {
        "city": "Sour",
        "country": "Lebanon",
        "governorate": "South"
      },
      "arrivalTimeFrom": "06:00",
      "arrivalTimeTo": "06:40",
      "latitude": 33.2707,
      "longitude": 35.2038,
      "name": "Sour",
      "order": 0,
      "placeId": "sour-1"
    },
    {
      "address": {
        "city": "Abbasieh",
        "country": "Lebanon",
        "governorate": "South"
      },
      "arrivalTimeFrom": "07:00",
      "arrivalTimeTo": "07:30",
      "latitude": 33.2856,
      "longitude": 35.2274,
      "name": "Abbasieh",
      "order": 1,
      "placeId": "abbasieh-1"
    },
    {
      "address": {
        "city": "Saida",
        "country": "Lebanon",
        "governorate": "South"
      },
      "arrivalTimeFrom": "08:30",
      "arrivalTimeTo": "09:00",
      "latitude": 33.5531,
      "longitude": 35.3781,
      "name": "Saida",
      "order": 2,
      "placeId": "saida-1"
    }
  ],
  "maxCapacity": 20,
  "operatingTimeFrom": "05:00",
  "operatingTimeTo": "17:00",
  "pricePerMonth": 200,
  "pricePerRide": 20,
  "updatedAt": "5 June 2025 at 06:08:54 UTC-7", // (timestamp)
  "workingDays": { // (map)
    "friday": true,
    "monday": true,
    "thursday": true,
    "tuesday": true,
    "wednesday": true
  }
}

2. Users Collection
This collection stores data for all users. The user type is determined by the role field, which can be driver, rider, or admin.

2.1 Sample Document: Role "driver"
{
  "uid": "qiAbNEiKRfMzrxgA5DYtlh9A7Q73",
  "address": "canada",
  "busAssignments": [ // (array of strings)
    "4602DBmKb8SNmhGWAYjq",
    "CJws5XWFcmNrmhDSnjhK",
    "XSCGNjFsApC8qhrfpfvG",
    "UqWXwdym1JhpvuoV2gjl",
    "HQHOMrVDBKDBo6XzSEiM"
  ],
  "createdAt": "16 May 2025 at 08:46:19 UTC-7", // (timestamp)
  "email": "ali22@gmail.com",
  "licenseNumber": "112233",
  "name": "ali",
  "phoneNumber": "70049615",
  "role": "driver",
  "updatedAt": "5 June 2025 at 06:08:55 UTC-7" // (timestamp)
}

2.2 Sample Document: Role "rider"
{
  "uid": "kSmGtka6l1e1Qhe8LnvOpUWtrcm2",
  "address": "romania",
  "busAssignments": [ // (array of maps)
    {
      "assignedAt": "2025-05-18T23:15:43.816Z",
      "busId": "og54YDYInv76g5M9oAYa",
      "locationId": "loc-0",
      "paymentStatus": "unpaid",
      "subscriptionType": "per_ride"
    },
    {
      "assignedAt": "2025-05-18T23:37:34.834Z",
      "busId": "4602DBmKb8SNmhGWAYjq",
      "endDate": "2025-06-17T23:57:05.201Z",
      "locationId": null,
      "paymentStatus": "pending",
      "startDate": "2025-05-18T23:57:05.201Z",
      "subscriptionType": "monthly",
      "updatedAt": "2025-05-18T23:57:05.997Z"
    }
  ],
  "createdAt": "18 May 2025 at 06:15:38 UTC-7", // (timestamp)
  "email": "bibo@gmail.com",
  "emergencyContact": "",
  "name": "bob",
  "phoneNumber": "99999",
  "role": "rider",
  "updatedAt": "18 May 2025 at 06:57:24 UTC-7" // (timestamp)
}

2.3 Sample Document: Role "admin"
{
  "uid": "1NIk1jVesdbBsf3zG5hpSnhf1df1",
  "createdAt": "2025-05-31T08:09:48.062Z",
  "email": "fatima123@gmail.com",
  "name": "Fatima",
  "role": "admin"
}
