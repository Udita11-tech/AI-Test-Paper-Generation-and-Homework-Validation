class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="btn-primary mx-auto">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
    try {
        const stats = [
            { title: "Total Chapters Processed", value: "142", icon: "book-open", trend: { isPositive: true, value: 12 }, colorClass: "text-blue-600", bgClass: "bg-blue-50" },
            { title: "Generated Papers", value: "856", icon: "file-text", trend: { isPositive: true, value: 24 }, colorClass: "text-indigo-600", bgClass: "bg-indigo-50" },
            { title: "Validated Assignments", value: "3,204", icon: "check-square", trend: { isPositive: true, value: 8 }, colorClass: "text-emerald-600", bgClass: "bg-emerald-50" },
            { title: "Students Evaluated", value: "450", icon: "users", trend: { isPositive: false, value: 2 }, colorClass: "text-purple-600", bgClass: "bg-purple-50" },
        ];

        const chartData = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{
                label: 'Average Score (%)',
                data: [65, 68, 75, 72, 80],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        const chartOptions = {
            scales: {
                y: { min: 0, max: 100 }
            }
        };

        const barChartData = {
            labels: ['Physics', 'Chemistry', 'Biology', 'Math', 'English'],
            datasets: [{
                label: 'Generated Papers',
                data: [120, 95, 150, 210, 85],
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        };

        return (
            <DashboardLayout title="Dashboard Overview">
                <div className="space-y-6">
                    {/* Welcome Section */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Welcome back, Sarah! 👋</h2>
                            <p className="text-gray-500 mt-1">Here's what's happening in your classes today.</p>
                        </div>
                        <button className="btn-primary" onClick={() => window.location.href="generator.html"}>
                            <div className="icon-plus"></div> New Test Paper
                        </button>
                    </div>

                    {/* Quick Demo Flow */}
                    <div className="card p-6 bg-indigo-50 border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <div className="icon-circle-play text-indigo-600"></div> System Workflow Demo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                            <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 bg-indigo-200 -z-0 -translate-y-1/2"></div>
                            
                            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => window.location.href="chapters.html"}>
                                <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">1</div>
                                <div className="icon-cloud-upload text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>
                                <h4 className="font-semibold text-gray-900">Upload Chapter</h4>
                                <p className="text-xs text-gray-500 mt-1">Extract text & concepts from PDFs</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => window.location.href="generator.html"}>
                                <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">2</div>
                                <div className="icon-file-text text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>
                                <h4 className="font-semibold text-gray-900">Generate Paper</h4>
                                <p className="text-xs text-gray-500 mt-1">Create custom tests automatically</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => window.location.href="validation.html"}>
                                <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">3</div>
                                <div className="icon-check-square text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>
                                <h4 className="font-semibold text-gray-900">Validate Homework</h4>
                                <p className="text-xs text-gray-500 mt-1">Grade OCR text with AI feedback</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative z-10 flex flex-col items-center text-center group hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => window.location.href="reports.html"}>
                                <div className="w-10 h-10 bg-indigo-100 text-[var(--primary)] rounded-full flex items-center justify-center font-bold mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">4</div>
                                <div className="icon-chart-bar text-2xl text-gray-400 mb-2 group-hover:text-[var(--primary)]"></div>
                                <h4 className="font-semibold text-gray-900">View Reports</h4>
                                <p className="text-xs text-gray-500 mt-1">Analyze student performance</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, idx) => (
                            <StatCard key={idx} {...stat} />
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Performance Trend</h3>
                            <CustomChart type="line" data={chartData} options={chartOptions} />
                        </div>
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Activity (Papers Generated)</h3>
                            <CustomChart type="bar" data={barChartData} />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    } catch (error) {
        console.error('App component error:', error);
        return null;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);