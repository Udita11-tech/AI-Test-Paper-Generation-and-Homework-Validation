function Sidebar({ currentPath }) {
    const navItems = [
        { name: 'Dashboard', icon: 'layout-dashboard', path: 'index.html' },
        { name: 'Chapters', icon: 'book-open', path: 'chapters.html' },
        { name: 'Test Generator', icon: 'file-text', path: 'generator.html' },
        { name: 'Homework Validation', icon: 'check-square', path: 'validation.html' },
        { name: 'Reports & Analytics', icon: 'chart-bar', path: 'reports.html' },
        { name: 'Settings', icon: 'settings', path: 'settings.html' },
    ];

    const handleNavigation = (path) => {
        // If we are already on the target path's pseudo-equivalent, do nothing
        const currentPathName = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPathName === path) return;
        window.location.href = path;
    };

    const isActive = (path) => {
        const currentPathName = window.location.pathname.split('/').pop() || 'index.html';
        return currentPathName === path;
    };

    return (
        <aside className="w-64 bg-white border-r border-[var(--border-color)] h-screen fixed left-0 top-0 flex flex-col" data-name="sidebar" data-file="layouts/Sidebar.js">
            <div className="h-16 flex items-center px-6 border-b border-[var(--border-color)] bg-[var(--primary)] text-white">
                <div className="icon-graduation-cap text-white text-2xl mr-3"></div>
                <h1 className="font-bold text-lg tracking-tight">AI Assessment System</h1>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => handleNavigation(item.path)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive(item.path)
                                ? 'bg-indigo-50 text-[var(--primary)]'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <div className={`icon-${item.icon} text-lg mr-3 ${isActive(item.path) ? 'text-[var(--primary)]' : 'text-gray-400'}`}></div>
                        {item.name}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-3">
                    <img src="https://ui-avatars.com/api/?name=Teacher+Admin&background=4f46e5&color=fff" alt="User" className="w-9 h-9 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {typeof API !== 'undefined' && API.auth.getUser() ? API.auth.getUser().Name : 'Sarah Jenkins'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">Teacher</p>
                    </div>
                </div>
                <button 
                    onClick={() => { if(typeof API !== 'undefined') API.auth.logout(); }}
                    className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                    <div className="icon-log-out"></div> Logout
                </button>
            </div>
        </aside>
    );
}