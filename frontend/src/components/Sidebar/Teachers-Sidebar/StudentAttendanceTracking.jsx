import { ClipboardList } from 'lucide-react';

const StudentAttendanceTracking = () => {
	return (
		<div className="flex flex-col h-full p-6">
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-1">
					<ClipboardList size={22} className="text-indigo-400" />
					<h1 className="text-xl font-semibold text-slate-100">Student Attendance Tracking</h1>
				</div>
				<p className="text-slate-500 text-sm ml-9">
					Record and review attendance across your classes.
				</p>
			</div>

			<div className="flex-1 flex items-center justify-center">
				<div className="text-center space-y-2">
					<ClipboardList size={40} className="text-slate-700 mx-auto" />
					<p className="text-slate-500 text-sm">Coming soon</p>
				</div>
			</div>
		</div>
	);
};

export default StudentAttendanceTracking;