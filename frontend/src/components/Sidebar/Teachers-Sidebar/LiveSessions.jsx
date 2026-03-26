import { Video } from 'lucide-react';

const LiveSessions = () => {
	return (
		<div className="flex flex-col h-full p-6">
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-1">
					<Video size={22} className="text-indigo-400" />
					<h1 className="text-xl font-semibold text-slate-100">Live Sessions</h1>
				</div>
				<p className="text-slate-500 text-sm ml-9">
					Start, schedule, and manage live class sessions.
				</p>
			</div>

			<div className="flex-1 flex items-center justify-center">
				<div className="text-center space-y-2">
					<Video size={40} className="text-slate-700 mx-auto" />
					<p className="text-slate-500 text-sm">Coming soon</p>
				</div>
			</div>
		</div>
	);
};

export default LiveSessions;