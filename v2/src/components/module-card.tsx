
import { Link } from '@tanstack/react-router';
import type { Module } from './features/module';
import type { JSX } from 'react';

const statusBadges: Record<Module['status'], string> = {
    available: '',
    in_development: 'In Development',
};

const statusStyles: Record<Module['status'], string> = {
    available: 'hover:shadow-md hover:border-blue-400 cursor-pointer',
    in_development: 'opacity-60 cursor-not-allowed',
};

const actionByStatus: Record<
    Module['status'],
    (mod: Module) => JSX.Element
> = {
    available: (mod) => (
        <Link
            to={`/${mod.id}`}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
            Access <span className="ml-1">→</span>
        </Link>
    ),
    in_development: () => (
        <span className="text-sm text-gray-400 italic">Coming soon</span>
    ),
};

export default function ModuleCard({ module }: { module: Module }) {
    return (
        <div
            className={`relative rounded-lg border bg-white p-6 shadow-sm transition-all ${statusStyles[module.status]}`}
        >
            {statusBadges[module.status] && (
                <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                    {statusBadges[module.status]}
                </span>
            )}

            <div className="text-4xl mb-3">{module.icon}</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {module.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4">{module.description}</p>
            {actionByStatus[module.status](module)}
        </div>
    );
}