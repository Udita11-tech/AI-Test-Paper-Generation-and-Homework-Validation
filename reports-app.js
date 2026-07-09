class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() { return this.state.hasError ? <div>Error</div> : this.props.children; }
}

function ReportsApp() {
    try {
        const [downloading, setDownloading] = React.useState(false);
        const [toast, setToast] = React.useState(null);
        const [selectedStudent, setSelectedStudent] = React.useState(null);

        const studentData = [
            { name: "Alice Smith", score: "88%", trend: "+2%", weak: "Vectors", strong: "Work & Energy", rank: "Top 10%" },
            { name: "Bob Johnson", score: "72%", trend: "-5%", weak: "Thermodynamics", strong: "Motion", rank: "Average" },
            { name: "Charlie Brown", score: "95%", trend: "+1%", weak: "None", strong: "All Topics", rank: "Top 5%" }
        ];

        const chartData = {
            labels: ['Ch 1: Motion', 'Ch 2: Force', 'Ch 3: Work', 'Ch 4: Energy'],
            datasets: [{
                label: 'Class Average',
                data: [85, 78, 92, 70],
                backgroundColor: ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b'],
                borderRadius: 6
            }]
        };

        const handleDownload = () => {
            setDownloading(true);
            setTimeout(() => {
                setDownloading(false);
                setToast("Report downloaded successfully as PDF!");
                setTimeout(() => setToast(null), 3000);
            }, 1500);
        };

        return (
            <DashboardLayout title="Reports & Analytics">
                <div className="space-y-6 relative">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Class Performance Overview</h2>
                        <button className="btn-primary" onClick={handleDownload} disabled={downloading}>
                            {downloading ? <div className="icon-loader animate-spin"></div> : <div className="icon-download"></div>}
                            {downloading ? 'Exporting...' : 'Export Class Report'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card p-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">Chapter-wise Performance Analysis</h3>
                            <CustomChart type="bar" data={chartData} />
                        </div>
                        <div className="card p-6 bg-gradient-to-br from-indigo-50 to-white flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-indigo-900 flex items-center gap-2"><div className="icon-triangle-alert text-orange-500"></div> Class Weak Topics</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">1. Thermodynamics (Avg 65%)</div>
                                    <div className="p-3 bg-orange-50 text-orange-800 rounded-lg text-sm font-medium border border-orange-100">2. Kinetic Energy (Avg 70%)</div>
                                    <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-medium border border-yellow-100">3. Vectors (Avg 72%)</div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-4 text-emerald-900 flex items-center gap-2"><div className="icon-medal text-emerald-500"></div> Class Strong Topics</h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-medium border border-emerald-100">1. Work (Avg 92%)</div>
                                    <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium border border-blue-100">2. Motion (Avg 85%)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Student Performance Records</h3>
                            <div className="relative">
                                <div className="icon-search absolute left-3 top-2 text-gray-400"></div>
                                <input type="text" placeholder="Search student..." className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:border-[var(--primary)]" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-[var(--border-color)] text-gray-500 text-sm">
                                        <th className="px-6 py-3 font-medium">Student Name</th>
                                        <th className="px-6 py-3 font-medium">Average Score</th>
                                        <th className="px-6 py-3 font-medium">Trend</th>
                                        <th className="px-6 py-3 font-medium">Weakest Topic</th>
                                        <th className="px-6 py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {studentData.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                    {s.name.split(' ').map(n=>n[0]).join('')}
                                                </div>
                                                {s.name}
                                            </td>
                                            <td className="px-6 py-4 font-medium">{s.score}</td>
                                            <td className={`px-6 py-4 font-medium flex items-center gap-1 ${s.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                                <div className={`icon-${s.trend.startsWith('+') ? 'trending-up' : 'trending-down'} text-sm`}></div>
                                                {s.trend}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-sm">{s.weak}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedStudent(s)}
                                                    className="btn-secondary text-sm py-1 px-3 ml-auto hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                                >
                                                    <div className="icon-users"></div> Parent Report
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Parent Report Modal */}
                    {selectedStudent && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
                                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><div className="icon-file-badge text-[var(--primary)]"></div> Parent Report Card</h3>
                                    <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 p-1"><div className="icon-x"></div></button>
                                </div>
                                <div className="p-8 overflow-y-auto space-y-6">
                                    <div className="text-center pb-6 border-b border-gray-100 border-dashed">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                                        <p className="text-gray-500 mt-1">Science Assessment Report • Spring 2026</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-indigo-50 rounded-xl p-6 text-center border border-indigo-100">
                                            <p className="text-sm font-medium text-indigo-900 mb-1">Overall Grade</p>
                                            <p className="text-4xl font-bold text-[var(--primary)]">{selectedStudent.score}</p>
                                            <p className={`text-xs mt-2 font-medium ${selectedStudent.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedStudent.trend} compared to last term
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-3">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Strengths</p>
                                                <div className="text-sm font-medium text-emerald-700 flex items-center gap-1 mt-1"><div className="icon-circle-check text-xs"></div> {selectedStudent.strong}</div>
                                            </div>
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Needs Focus</p>
                                                <div className="text-sm font-medium text-orange-700 flex items-center gap-1 mt-1"><div className="icon-target text-xs"></div> {selectedStudent.weak}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2">Teacher's Note</h4>
                                        <p className="text-sm text-gray-600 italic bg-gray-50 p-4 rounded-lg border-l-4 border-[var(--primary)]">
                                            "{selectedStudent.name} has shown a {selectedStudent.trend.startsWith('+') ? 'great improvement' : 'slight decline'} recently. They are doing excellent in {selectedStudent.strong}. We recommend dedicating an extra 20 minutes a day focusing on {selectedStudent.weak} to ensure a solid foundation before the finals."
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                    <button onClick={() => setSelectedStudent(null)} className="btn-secondary">Close</button>
                                    <button className="btn-primary" onClick={() => {
                                        setSelectedStudent(null);
                                        setToast("Parent report sent via email!");
                                        setTimeout(() => setToast(null), 3000);
                                    }}><div className="icon-send"></div> Email to Parent</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {toast && (
                        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up z-50">
                            <div className="icon-circle-check text-green-400"></div>
                            {toast}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    } catch (error) { return null; }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><ReportsApp /></ErrorBoundary>);