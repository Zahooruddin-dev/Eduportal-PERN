import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import SidebarContent from './SidebarContent';

const Sidebar = ({
	activePage,
	onPageChange,
	userName = 'Guest',
	userRole = 'User',
	userProfile = null,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (!mobile) setIsOpen(false);
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	useEffect(() => {
		document.body.style.overflow = isOpen && isMobile ? 'hidden' : 'unset';
	}, [isOpen, isMobile]);

	useEffect(() => {
		document.documentElement.style.setProperty(
			'--sidebar-width',
			isMobile ? '280px' : collapsed ? '72px' : '280px',
		);
	}, [collapsed, isMobile]);

	const handlePageChange = (id) => {
		onPageChange(id);
		if (isMobile) setIsOpen(false);
	};

	return (
		<>
			{isMobile && (
				<button
					className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-950 text-slate-200 border border-slate-800"
					onClick={() => setIsOpen((v) => !v)}
					aria-label={isOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isOpen}
				>
					{isOpen ? <X size={20} /> : <Menu size={20} />}
				</button>
			)}

			{isMobile && isOpen && (
				<div
					className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
					onClick={() => setIsOpen(false)}
					aria-hidden="true"
				/>
			)}

			<aside
				className={[
					'fixed top-0 left-0 h-full bg-slate-950 border-r border-slate-800/60 flex flex-col z-40 transition-all duration-300 ease-in-out',
					isMobile
						? `w-[280px] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
						: collapsed
							? 'w-[72px]'
							: 'w-[280px]',
				].join(' ')}
				aria-label="Main navigation"
			>
				<SidebarContent
					activePage={activePage}
					onPageChange={handlePageChange}
					userName={userName}
					userRole={userRole}
					userProfile={userProfile}
					collapsed={collapsed && !isMobile}
					onCollapse={() => setCollapsed((v) => !v)}
					isMobile={isMobile}
				/>
			</aside>
		</>
	);
};

export default Sidebar;