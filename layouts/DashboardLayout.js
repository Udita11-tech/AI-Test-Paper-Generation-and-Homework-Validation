function DashboardLayout({ children, title }) {
    React.useEffect(() => {
        if (typeof API !== 'undefined') API.auth.checkAuth();
        
        // Apply dark mode
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.setProperty('--bg-body', '#0f172a');
            document.documentElement.style.setProperty('--text-main', '#f8fafc');
            document.documentElement.style.setProperty('--bg-sidebar', '#1e293b');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.setProperty('--bg-body', '#f8fafc');
            document.documentElement.style.setProperty('--text-main', '#0f172a');
            document.documentElement.style.setProperty('--bg-sidebar', '#ffffff');
        }
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] transition-colors duration-200" data-name="dashboard-layout" data-file="layouts/DashboardLayout.js">
            <Sidebar />
            <div className="pl-64 flex flex-col min-h-screen">
                <Header title={title} />
                <main className="flex-1 p-8">
                    {children}
                </main>
                <footer className="py-4 text-center text-sm text-gray-500 border-t border-[var(--border-color)] bg-white mt-auto">
                    &copy; 2026 AI Test Paper & Homework Validation System. All rights reserved.
                </footer>
            </div>
        </div>
    );
}