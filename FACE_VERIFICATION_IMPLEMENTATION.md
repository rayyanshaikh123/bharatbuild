# Face Verification Implementation for Manual Attendance

## Overview
This document describes the implementation of face verification for manual attendance check-in and checkout. The system now properly verifies that the same person who checked in is the one checking out, preventing fraud by using different face images.

## Problem Solved
Previously, the system stored Face objects in memory which were not serializable and the comparison algorithm was too lenient (15% tolerance), allowing different faces to pass verification. The system also had no backend integration.

## Solution Architecture

### 1. Face Feature Extraction (Serializable)
- **File**: `app/lib/services/face_verification_service.dart`
- **New Class**: `FaceFeatures` - A serializable class that stores:
  - Landmark positions (leftEye, rightEye, noseBase, mouth, cheeks)
  - Geometric distances (eyeDistance, noseMouthDistance, eyeToNoseDistance)
  - Face dimensions (faceWidth, faceHeight)
- **Methods**:
  - `extractFaceFeatures(Face)` - Extracts serializable features from MLKit Face object
  - `compareFaceFeatures(FaceFeatures, FaceFeatures)` - Compares two face feature sets

### 2. Improved Face Comparison Algorithm
- **Stricter Matching**: Reduced tolerance from 15% to 10%
- **Multiple Ratio Checks**: Uses 4 different geometric ratios:
  1. Eye Distance / Nose-Mouth Distance
  2. Eye-Nose Distance / Nose-Mouth Distance
  3. Face Width / Face Height (aspect ratio)
  4. Eye Distance / Face Width
- **Match Requirement**: Requires at least 3 out of 4 ratios to match (75% match rate)
- **Server-Side Verification**: Backend also performs verification for additional security

### 3. Database Schema
- **Migration File**: `backend/migrations/add_manual_attendance_face_verification.sql`
- **New Columns in `attendance` table**:
  - `check_in_face_image` (bytea) - Face image captured during check-in
  - `check_in_face_features` (jsonb) - Extracted face features in JSON format
  - `check_out_face_image` (bytea) - Face image captured during checkout
  - `check_out_face_features` (jsonb) - Extracted face features from checkout
  - `face_verification_status` (text) - Status: 'PENDING', 'VERIFIED', 'FAILED'
  - `face_verification_confidence` (numeric) - Confidence score (0-1)

### 4. Backend API Routes
- **File**: `backend/routes/engineer/attendance.js`

#### POST `/engineer/attendance/manual/check-in`
- Creates manual attendance with face verification
- **Request**: Multipart form with:
  - `faceImage` (file) - Face image
  - `labourId` (string) - Labour ID
  - `projectId` (string) - Project ID
  - `name` (string) - Labour name
  - `category` (string) - Labour category/skill
  - `faceFeatures` (JSON string) - Serialized face features
- **Response**: Attendance record with check-in data

#### POST `/engineer/attendance/manual/checkout`
- Verifies checkout face against check-in face
- **Request**: Multipart form with:
  - `faceImage` (file) - Checkout face image
  - `attendanceId` (string) - Attendance record ID
  - `faceFeatures` (JSON string) - Serialized checkout face features
- **Response**: 
  - Updated attendance record
  - Verification result (verified, confidence, message)

#### GET `/engineer/attendance/manual/list`
- Gets all manual attendance records for a project and date
- **Query Parameters**: `projectId`, `date` (optional)
- **Response**: List of attendance records

### 5. Flutter Implementation

#### Manual Attendance Service
- **File**: `app/lib/services/manual_attendance_service.dart`
- Handles all API communication for manual attendance
- Methods:
  - `checkIn()` - Sends check-in with face image and features
  - `checkout()` - Sends checkout with face image and features
  - `getManualAttendance()` - Fetches attendance records

#### Updated Screens

**Manual Attendance Screen** (`app/lib/screens/engineer/manual_attendance_screen.dart`):
- Uses backend API instead of in-memory storage
- Displays face verification status
- Shows refresh functionality
- Proper error handling

**Add Labour Screen** (`app/lib/screens/engineer/add_labour_screen.dart`):
- Searches for labour by phone number
- Captures and verifies face before check-in
- Sends check-in data to backend with face features
- Returns success to refresh parent screen

## Workflow

### Check-In Flow
1. Engineer opens "Add Labour" screen
2. Enters phone number and searches for labour
3. Captures face photo
4. System detects face and extracts features
5. Face features are sent to backend along with image
6. Backend stores check-in face image and features
7. Attendance record created with status 'CHECKED_IN'

### Checkout Flow
1. Engineer selects a checked-in labour
2. Clicks "Checkout & Verify Face"
3. System captures checkout face photo
4. Face is detected and features extracted
5. Checkout face features sent to backend
6. Backend compares checkout features with check-in features
7. If match (≥3/4 ratios within 10% tolerance):
   - Status updated to 'PAID'
   - Face verification status set to 'VERIFIED'
8. If no match:
   - Face verification status set to 'FAILED'
   - Error message shown to user

## Security Features
1. **Server-Side Verification**: Face comparison happens on backend, preventing client-side manipulation
2. **Stricter Matching**: 10% tolerance with 75% match requirement
3. **Multiple Ratio Checks**: 4 different geometric ratios prevent false matches
4. **Image Storage**: Both check-in and checkout images stored for audit trail
5. **Feature Storage**: Face features stored as JSON for verification and audit

## Database Migration
To apply the database changes, run:
```sql
-- Run the migration file
\i backend/migrations/add_manual_attendance_face_verification.sql
```

Or execute the SQL directly in your database.

## Testing
1. **Check-In**: Verify face is detected and features are extracted
2. **Checkout with Same Face**: Should verify successfully
3. **Checkout with Different Face**: Should fail verification
4. **Backend Verification**: Check that server-side comparison matches client-side

## Future Improvements
1. Add confidence score calculation and display
2. Support for multiple face detection improvements
3. Face image retrieval endpoint for viewing stored images
4. Analytics on verification success/failure rates
5. Option to retry verification with different photo
