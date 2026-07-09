function Header({ title }) {
    return (
        <header className="h-16 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-8 sticky top-0 z-10" data-name="header" data-file="layouts/Header.js">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            
            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 relative">
                    <div className="icon-bell text-xl"></div>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
            </div>
        </header>
    );
}