function SignupApp() {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (API.auth.getUser()) window.location.href = 'index.html';
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await API.auth.signup(name, email, password);
            window.location.href = 'index.html';
        } catch (err) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <div className="icon-user-plus text-2xl text-[var(--primary)]"></div>
                    </div>
                    <h2 className="text-2xl font-bold">Create Account</h2>
                    <p className="text-gray-500 mt-2">Join the AI Assessment System</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input type="text" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input type="email" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input type="password" required className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--primary)] outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2">
                        {loading ? <div className="icon-loader animate-spin"></div> : null}
                        Sign Up
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account? <a href="login.html" className="text-[var(--primary)] hover:underline">Sign in</a>
                </p>
            </div>
        </div>
    );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SignupApp />);