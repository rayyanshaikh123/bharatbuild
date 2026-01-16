import React from 'react';

const StatusBadge = ({ status }: { status: string }) => {
    return (
        <span data-status={status} className={`status-badge`}>
            {status}
        </span>
    );
};

export default StatusBadge;
