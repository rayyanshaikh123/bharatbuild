This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.





OVERALL USER FLOW (Role-Based)


---

OWNER (Contractor / Builder)

Owner
→ Signs Up
→ Creates Organization
→ Approves Managers
→ Views All Projects
→ Views Cost, Labour, Material, and DPR Dashboards
→ Reviews Audit Logs
→ Downloads Bill-Readiness & Cost Reports

Owner does not enter site data
Owner does not mark attendance
Owner does not create DPRs


---

PROJECT MANAGER

Manager
→ Signs Up
→ Requests to Join Organization
→ Owner Approves
→ Logs In
→ Creates Project
→ Sets Project Location (Geo-Fence)
→ Assigns Site Engineers to Project
→ Receives DPRs, Material Requests, Wage Data
→ Reviews
→ Approves or Rejects
→ Sees Project Progress & Costs
→ Sends Queries Back to Site Engineer

Manager is the final control point.


---

SITE ENGINEER

Site Engineer
→ Signs Up
→ Requests to Join Organization
→ Manager Approves
→ Assigned to One or More Projects
→ Goes to Site
→ App Checks GPS & Geo-Fence
→ Marks Labour Attendance
→ Records Work Done
→ Uploads Photos
→ Enters Material Used & Required
→ Enters Daily Wage Rates
→ Submits Daily Progress Report (DPR)
→ Waits for Manager Approval
→ Sees Approved / Rejected Status

Once submitted → cannot edit
Once approved → permanently locked


---

LABOUR

Labour
→ Signs Up (Phone + OTP)
→ App Downloads Assigned Site Geo-Fence
→ Goes to Site
→ App Uses GPS
→ Checks In
→ Works
→ Checks Out
→ Attendance Sent for Verification
→ Sees Own Work Hours & Days

Labour cannot approve
Labour cannot change data


---

APPROVAL & CONTROL FLOW

Labour Check-In
→ Goes to Site Engineer

Site Engineer Attendance
→ Goes to Manager

Site Engineer DPR
→ Goes to Manager

Material Request
→ Goes to Manager

Daily Wage Rates
→ Goes to Manager

Manager
→ Approves or Rejects
→ If Approved → Data Locked
→ If Rejected → Sent Back to Site Engineer


---

OFFLINE FLOW

Site Engineer / Labour Offline
→ Data Stored Locally
→ GPS Still Works
→ Geo-Fence Still Checked
→ When Internet Returns
→ Data Syncs to Server
→ Manager Reviews


---

BILL & COST FLOW

Attendance + Hours
→ Daily Wages
→ Labour Cost

DPR Tasks
→ Work Quantities

Material Requests
→ Material Cost

Approved Data
→ Cost Summary
→ Budget vs Actual
→ Bill-Readiness Reports

(No invoice generation — only verified cost data)