import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import useTheme from '../../hooks/useTheme';
import SidebarContent from './SidebarContent';

const MOBILE_BREAKPOINT = 767;
const EXPANDED_WIDTH = '288px';
const COLLAPSED_WIDTH = '84px';

const Sidebar = ({
	activePage,
	onPageChange,
	userName = 'Guest',
	userRole = 'user',
	userProfile = null,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const { theme, toggleTheme } = useTheme();

	useEffect(() => {
		const checkViewport = () => {
			const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
			setIsMobile(mobile);
			if (!mobile) setIsOpen(false);
		};

		checkViewport();
		window.addEventListener('resize', checkViewport);
		return () => window.removeEventListener('resize', checkViewport);
	}, []);

	useEffect(() => {
		document.body.style.overflow = isOpen && isMobile ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen, isMobile]);

	useEffect(() => {
		const width = isMobile
			? '0px'
			: collapsed
				? COLLAPSED_WIDTH
				: EXPANDED_WIDTH;
		document.documentElement.style.setProperty('--sidebar-width', width);
	}, [collapsed, isMobile]);

	const handlePageChange = (pageId) => {
		onPageChange(pageId);
		if (isMobile) setIsOpen(false);
	};

	const effectiveCollapsed = collapsed && !isMobile;
	const sidebarWidth = isMobile
		? EXPANDED_WIDTH
		: effectiveCollapsed
			? COLLAPSED_WIDTH
			: EXPANDED_WIDTH;

	return (
		<>
			{isMobile && (
				<button
					onClick={() => setIsOpen((prev) => !prev)}
					aria-label={isOpen ? 'Close menu' : 'Open menu'}
					className='fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text)] shadow-[0_8px_20px_rgba(15,23,42,0.14)]'
				>
					{isOpen ? <X size={19} /> : <Menu size={19} />}
				</button>
			)}

			{isMobile && isOpen && (
				<button
					aria-label='Close sidebar overlay'
					onClick={() => setIsOpen(false)}
					className='fixed inset-0 z-40 bg-black/20'
				/>
			)}

			<aside
				className='fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-[var(--sb-border)] bg-[var(--sb-bg)] transition-all duration-300 ease-in-out'
				style={{
					width: sidebarWidth,
					transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
					boxShadow: isMobile ? '0 12px 34px rgba(15, 23, 42, 0.2)' : 'none',
				}}
			>
				<SidebarContent
					activePage={activePage}
					onPageChange={handlePageChange}
					userName={userName}
					userRole={userRole}
					userProfile={userProfile}
					collapsed={effectiveCollapsed}
					onCollapse={() => setCollapsed((prev) => !prev)}
					theme={theme}
					onToggleTheme={toggleTheme}
				/>
			</aside>
		</>
	);
};

export default Sidebar;
