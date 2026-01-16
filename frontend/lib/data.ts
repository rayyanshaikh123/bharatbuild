export interface Project {
    id: string;
    name: string;
    location: string;
    progress: number;
    status: 'ACTIVE' | 'DELAYED' | 'COMPLETE';
    siteCode: string;
    lastUpdate: string;
}

export const MOCK_PROJECTS: Project[] = [
    { id: '1', name: 'Skyline Residence (Phase 1)', location: 'Worli, Mumbai', progress: 68, status: 'ACTIVE', siteCode: 'SITE-MH-01', lastUpdate: '2 mins ago' },
    { id: '2', name: 'Amanora Tech Extension', location: 'Hadapsar, Pune', progress: 34, status: 'DELAYED', siteCode: 'SITE-MH-02', lastUpdate: '1 hour ago' },
    { id: '3', name: 'Whitefield Metro Hub', location: 'Whitefield, Bangalore', progress: 12, status: 'ACTIVE', siteCode: 'SITE-KA-03', lastUpdate: 'Just now' },
];

export const MOCK_LOGS = [
    { id: 'log-1', project: 'Skyline Residence', engineer: 'Amit Verma', type: 'Progress Audit', summary: 'Casting of floor slab 14 complete. Curing initiated.', status: 'PENDING', time: '14:20' },
    { id: 'log-2', project: 'Amanora Tech Park', engineer: 'Suresh Raina', type: 'Safety Check', summary: 'Scaffolding inspection for Block B verified. All standards met.', status: 'APPROVED', time: '11:45' },
];
