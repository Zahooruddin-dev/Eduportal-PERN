import { Video } from 'lucide-react';

const LiveSessions = () => {
	return (
		<div className="flex flex-col h-full p-6">
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-1">
					<Video size={22} className="text-[var(--sb-accent)]" />
					<h1 className="text-xl font-semibold text-[var(--app-text)]">Live Sessions</h1>
				</div>
				<p className="text-[var(--sb-text-dim)] text-sm ml-9">
					Start, schedule, and manage live class sessions.
				</p>
			</div>

			<div className="flex-1 flex items-center justify-center">
				<div className="text-center space-y-2">
					<Video size={40} className="text-[var(--sb-text-dim)] mx-auto" />
					<p className="text-[var(--sb-text-dim)] text-sm">Coming soon</p>
				</div>
			</div>
		</div>
	);
};

export default LiveSessions;