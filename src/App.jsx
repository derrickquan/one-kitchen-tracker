// v1.2.0 - Added Firebase email/password authentication.  
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc,
    query,
    writeBatch,
    setLogLevel
} from 'firebase/firestore';

// --- Helper Components & Icons (as SVGs to keep it in one file) ---

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);
const Card = ({ title, children, className = '' }) => (
    <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700/50 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>
        {children}
    </div>
);

// --- New Login Screen Component ---
const LoginScreen = ({ auth }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // onAuthStateChanged will handle displaying the app
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <h1 className="text-4xl font-bold text-white text-center mb-2">One Kitchen <span className="text-indigo-400">Tracker</span></h1>
                 <p className="text-center text-gray-400 mb-8">Please login or sign up to continue</p>
                <Card title={isLogin ? "Login" : "Sign Up"} className="w-full">
                    <form onSubmit={handleAuthAction} className="space-y-6">
                        {error && <p className="bg-red-800/50 text-red-300 border border-red-700 p-3 rounded-lg text-center text-sm">{error}</p>}
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 transition-colors duration-300 flex justify-center items-center"
                            >
                                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : (isLogin ? 'Login' : 'Create Account')}
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-sm text-gray-400 mt-6">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-indigo-400 hover:text-indigo-300 ml-2 focus:outline-none">
                            {isLogin ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </Card>
            </div>
        </div>
    );
};


// --- Main Application ---
export default function App() {
    const [view, setView] = useState('dashboard');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState(null);

    const [revenues, setRevenues] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [dateFilter, setDateFilter] = useState({ type: 'all', startDate: '', endDate: '' });
    const [reportTypeFilter, setReportTypeFilter] = useState('all');


    const appId = typeof __app_id !== 'undefined' ? __app_id : 'one-kitchen-tracker';

    // 1. Initialize Firebase and Auth State
    useEffect(() => {
        // Load external scripts for PDF and Excel generation
        const pdfScript = document.createElement('script');
        pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        pdfScript.async = true;
        document.body.appendChild(pdfScript);

        const excelScript = document.createElement('script');
        excelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        excelScript.async = true;
        document.body.appendChild(excelScript);

        if (typeof __firebase_config === 'undefined') {
            console.error("Firebase config is not available.");
            setIsAuthReady(true);
            setIsLoading(false);
            return;
        }

        try {
            const firebaseConfig = JSON.parse(__firebase_config);
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);
            setLogLevel('debug');

            const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                setUser(user);
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                }
                setIsAuthReady(true);
            });

            return () => {
                unsubscribe();
                document.body.removeChild(pdfScript);
                document.body.removeChild(excelScript);
            };
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setIsAuthReady(true);
            setIsLoading(false);
        }
    }, []);

    // 2. Fetch data once user is authenticated
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        
        const prepopulateVendors = async () => {
            const initialVendors = [
                { name: 'Beta Security', category: 'Professional Services', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'D&L Meats', category: 'COGS', contactPerson: 'David Lo', email: '', phoneNumber: '626-945-8998', accountNumber: '' },
                { name: 'Employers', category: 'Insurance', contactPerson: '', email: '', phoneNumber: '', accountNumber: 'EIG 2649761 06' },
                { name: 'Hing Lee Farms', category: 'COGS', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Geico', category: 'Insurance', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Tom Quan', category: 'Rent', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'SCE', category: 'Utilities', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'SJ Distributors', category: 'COGS', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'So Cal Gas', category: 'Utilities', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Sure Payroll', category: 'Professional Services', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Tesla', category: 'Utilities', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Tesla Insurance', category: 'Insurance', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
                { name: 'Wing Sing', category: 'COGS', contactPerson: '', email: '', phoneNumber: '', accountNumber: '' },
            ];

            const vendorsCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/vendors`);
            const batch = writeBatch(db);
            initialVendors.forEach(vendor => {
                const docRef = doc(vendorsCollectionRef);
                batch.set(docRef, vendor);
            });
            await batch.commit();
            console.log("Initial vendors have been prepopulated.");
        };


        const collectionsMeta = {
            revenues: { setter: setRevenues, ref: collection(db, `/artifacts/${appId}/users/${userId}/revenues`) },
            expenses: { setter: setExpenses, ref: collection(db, `/artifacts/${appId}/users/${userId}/expenses`) },
            vendors: { setter: setVendors, ref: collection(db, `/artifacts/${appId}/users/${userId}/vendors`), prepopulate: prepopulateVendors },
        };

        const collectionNames = Object.keys(collectionsMeta);
        let loadedCollections = 0;
        const totalCollections = collectionNames.length;
        
        if(totalCollections === 0) {
             setIsLoading(false);
             return;
        }

        const unsubscribes = collectionNames.map(name => {
            const { setter, ref, prepopulate } = collectionsMeta[name];
            const q = query(ref);
            return onSnapshot(q, (snapshot) => {
                if (snapshot.empty && prepopulate) {
                    prepopulate();
                }

                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (name === 'vendors') {
                    setter(data.sort((a,b) => a.name.localeCompare(b.name)));
                } else {
                     setter(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
                }

                if (name === Object.keys(collectionsMeta)[loadedCollections]) {
                    loadedCollections++;
                }
                
                if (loadedCollections >= totalCollections) {
                    setIsLoading(false);
                }
                
            }, (error) => {
                console.error(`Error fetching ${name}:`, error);
                setIsLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [isAuthReady, db, userId, appId]);

    // 3. Filter data based on dateFilter and reportTypeFilter state
    const { filteredRevenues, filteredExpenses } = useMemo(() => {
        const filterByDate = (data) => {
            if (dateFilter.type === 'all' || !data) return data;
            
            let start, end;
            const now = new Date();

            switch(dateFilter.type) {
                case 'thisMonth':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'lastMonth':
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                    break;
                case 'lastQuarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    const startMonth = currentQuarter * 3 - 3;
                    start = new Date(now.getFullYear(), startMonth, 1);
                    end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59);
                    break;
                case 'custom':
                    if (!dateFilter.startDate || !dateFilter.endDate) return data;
                    start = new Date(dateFilter.startDate);
                    end = new Date(dateFilter.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
                default: // Handles trailing months like '2025-08'
                    const [year, month] = dateFilter.type.split('-').map(Number);
                    start = new Date(year, month - 1, 1);
                    end = new Date(year, month, 0, 23, 59, 59);
                    break;
            }

            return data.filter(item => {
                if (!item.date) return false;
                // Replace hyphens with slashes to ensure the date is parsed in the local timezone, preventing UTC conversion issues.
                const itemDateStr = item.date.length === 7 ? `${item.date}-02` : item.date;
                const itemDate = new Date(itemDateStr.replace(/-/g, '/'));
                return itemDate >= start && itemDate <= end;
            });
        };

        const filterByReportType = (data) => {
            if (reportTypeFilter === 'all' || !data) return data;
             return data.filter(item => {
                if (reportTypeFilter === 'reportableOnly') {
                    return item.reportable !== false; // Includes true and undefined
                }
                if (reportTypeFilter === 'nonReportableOnly') {
                    return item.reportable === false;
                }
                return true;
             });
        };

        return {
            filteredRevenues: filterByReportType(filterByDate(revenues)),
            filteredExpenses: filterByReportType(filterByDate(expenses))
        };
    }, [revenues, expenses, dateFilter, reportTypeFilter]);

    // Derived state for dashboard totals (already uses filtered data)
    const totals = useMemo(() => {
        const totalRevenue = filteredRevenues.reduce((sum, item) => sum + parseFloat(item.checkAmount || 0) + parseFloat(item.cashAmount || 0), 0);
        const totalExpenses = filteredExpenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netProfit };
    }, [filteredRevenues, filteredExpenses]);

    const formatCurrency = (amount) => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(value)) return '$0.00';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const displayDateRange = useMemo(() => {
        if (dateFilter.type === 'all') return null;
        
        const formatDate = (date) => {
            if (typeof date === 'string') {
                // When date is a string 'YYYY-MM-DD', replace dashes to parse as local time.
                return new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US');
            }
            // If it's already a Date object, format it directly.
            return date.toLocaleDateString('en-US');
        };

        let start, end;
        const now = new Date();

        switch (dateFilter.type) {
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'lastQuarter':
                 const currentQuarter = Math.floor(now.getMonth() / 3);
                 const startMonth = currentQuarter * 3 - 3;
                 start = new Date(now.getFullYear(), startMonth, 1);
                 end = new Date(now.getFullYear(), startMonth + 3, 0);
                break;
            case 'custom':
                 if (!dateFilter.startDate || !dateFilter.endDate) return 'Custom Period';
                 start = dateFilter.startDate;
                 end = dateFilter.endDate;
                break;
            default: // Trailing months
                const [year, month] = dateFilter.type.split('-').map(Number);
                start = new Date(year, month - 1, 1);
                end = new Date(year, month, 0);
                break;
        }
        return `${formatDate(start)} - ${formatDate(end)}`;
    }, [dateFilter]);

    const MainContent = () => {
        if (!isAuthReady || isLoading) return <LoadingSpinner />;
        
        return (
            <div>
                {
                    {
                        'dashboard': <DashboardView totals={totals} revenues={filteredRevenues} expenses={filteredExpenses} formatCurrency={formatCurrency} vendors={vendors} displayDateRange={displayDateRange} />,
                        'revenue': <CrudView title="Revenue" data={filteredRevenues} db={db} userId={userId} appId={appId} collectionName="revenues" fields={['source', 'date', 'checkAmount', 'cashAmount', 'reportable']} formatCurrency={formatCurrency} />,
                        'expenses': <CrudView title="Expenses" data={filteredExpenses} db={db} userId={userId} appId={appId} collectionName="expenses" fields={['date', 'vendorId', 'category', 'amount', 'paymentType', 'reportable', 'description']} formatCurrency={formatCurrency} vendors={vendors} />,
                        'vendors': <CrudView title="Vendors" data={vendors} db={db} userId={userId} appId={appId} collectionName="vendors" fields={['name', 'category', 'contactPerson', 'email', 'phoneNumber', 'accountNumber']} formatCurrency={formatCurrency} />,
                    }[view] || <div>Select a view</div>
                }
            </div>
        )
    };
    
    const showFilter = ['dashboard', 'revenue', 'expenses'].includes(view);

    if (!isAuthReady) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <LoginScreen auth={auth} />;
    }

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <div className="w-full bg-gray-800/30 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-10">
                <header className="container mx-auto px-4 md:px-8 py-4 flex flex-col items-start md:flex-row md:justify-between md:items-center gap-4">
                    <div className="w-full md:w-auto">
                        <h1 className="text-3xl font-bold text-white flex-shrink-0">One Kitchen <span className="text-indigo-400">Tracker</span></h1>
                         {showFilter && displayDateRange && <p className="text-sm text-gray-400 mt-1">{displayDateRange}</p>}
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                        <div className="w-full md:w-auto flex-grow">
                             {showFilter && <FilterBar dateFilter={dateFilter} onDateFilterChange={setDateFilter} reportTypeFilter={reportTypeFilter} onReportTypeFilterChange={setReportTypeFilter} />}
                        </div>
                        <nav className="flex items-center bg-gray-900/50 border border-gray-700/50 rounded-full px-2 py-1">
                            <NavButton text="Dashboard" viewName="dashboard" currentView={view} setView={setView} />
                            <NavButton text="Revenue" viewName="revenue" currentView={view} setView={setView} />
                            <NavButton text="Expenses" viewName="expenses" currentView={view} setView={setView} />
                            <NavButton text="Vendors" viewName="vendors" currentView={view} setView={setView} />
                            <button onClick={handleLogout} className="px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 text-gray-300 hover:bg-red-600/70 hover:text-white ml-2">
                                Logout
                            </button>
                        </nav>
                    </div>
                </header>
            </div>
            <main className="container mx-auto p-4 md:p-8">
                <MainContent />
            </main>
        </div>
    );
}

const NavButton = ({ text, viewName, currentView, setView }) => (
    <button onClick={() => setView(viewName)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${currentView === viewName ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
        {text}
    </button>
);


function FilterBar({ dateFilter, onDateFilterChange, reportTypeFilter, onReportTypeFilterChange }) {
    const [customDates, setCustomDates] = useState({ 
        startDate: dateFilter.startDate || '', 
        endDate: dateFilter.endDate || '' 
    });

    const handleTypeChange = (e) => {
        const type = e.target.value;
        setCustomDates({ startDate: '', endDate: '' });
        if (type !== 'custom') {
            onDateFilterChange({ type, startDate: '', endDate: '' });
        } else {
             onDateFilterChange({ type, startDate: '', endDate: '' });
        }
    };

    const handleCustomDateChange = (e) => {
        setCustomDates(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const applyCustomFilter = () => {
        if (customDates.startDate && customDates.endDate) {
            onDateFilterChange({ type: 'custom', ...customDates });
        }
    };

    const trailingMonths = useMemo(() => {
        const months = [];
        let date = new Date();
        for (let i = 0; i < 13; i++) { // Changed to 13 months
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            months.push({
                value: `${year}-${month}`,
                label: date.toLocaleString('default', { month: 'long', year: 'numeric' })
            });
            date.setMonth(date.getMonth() - 1);
        }
        return months;
    }, []);

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col md:flex-row gap-2 items-center">
                 <select 
                    value={dateFilter.type} 
                    onChange={handleTypeChange}
                    className="shadow-inner appearance-none border rounded w-full md:w-auto py-2 px-3 bg-gray-700/80 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                    <option value="all">All Time</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="lastQuarter">Last Quarter</option>
                    <option value="custom">Custom Period</option>
                    <option disabled>──────────</option>
                    {trailingMonths.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <select 
                    value={reportTypeFilter} 
                    onChange={(e) => onReportTypeFilterChange(e.target.value)}
                    className="shadow-inner appearance-none border rounded w-full md:w-auto py-2 px-3 bg-gray-700/80 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                 >
                    <option value="reportableOnly">Reportable Only</option>
                    <option value="nonReportableOnly">Non-Reportable Only</option>
                    <option value="all">All</option>
                </select>
            </div>
            {dateFilter.type === 'custom' && (
                <div className="flex flex-col md:flex-row gap-2 items-center w-full">
                    <input 
                        type="date" 
                        name="startDate"
                        value={customDates.startDate}
                        onChange={handleCustomDateChange}
                        className="shadow-inner appearance-none border rounded w-full md:w-auto py-2 px-3 bg-gray-700/80 border-gray-600 text-white text-sm"
                    />
                     <span className="text-gray-400">to</span>
                    <input 
                        type="date" 
                        name="endDate"
                        value={customDates.endDate}
                        onChange={handleCustomDateChange}
                        className="shadow-inner appearance-none border rounded w-full md:w-auto py-2 px-3 bg-gray-700/80 border-gray-600 text-white text-sm"
                    />
                    <button onClick={applyCustomFilter} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg w-full md:w-auto text-sm">Apply</button>
                </div>
            )}
        </div>
    );
}

// --- View Components ---

function DashboardView({ totals, revenues, expenses, formatCurrency, vendors, displayDateRange }) {
    const [expandedExpenseGroups, setExpandedExpenseGroups] = useState({});

    const toggleExpenseGroup = (category) => {
        setExpandedExpenseGroups(prev => ({...prev, [category]: !prev[category]}));
    };
    
    const getVendorName = (vendorId) => {
        if (!vendors || !vendorId) return 'N/A';
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : 'Unknown Vendor';
    };

     const getExpenseDisplayLine = (expense) => {
        const vendorName = getVendorName(expense.vendorId);
        
        if (vendorName !== 'N/A' && vendorName !== 'Unknown Vendor') {
            return `${vendorName} (${expense.category || 'N/A'})`;
        }

        if (expense.description && expense.description.includes('---')) {
            const parts = expense.description.split('---');
            return `${parts[0]} (${expense.category || 'N/A'})`;
        }
        
        return expense.description || 'Expense';
    }

    const groupedRecentExpenses = useMemo(() => {
        if (!expenses) return null;
        
        const recentExpenses = expenses.slice(0, 20); // Show more items for grouping

        const groups = recentExpenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = { transactions: [], total: 0 };
            }
            acc[category].transactions.push(expense);
            acc[category].total += parseFloat(expense.amount || 0);
            return acc;
        }, {});
        
        const sortedCategories = Object.keys(groups).sort((a,b) => groups[b].total - groups[a].total);

        return { groups, sortedCategories };
    }, [expenses]);


    const handlePdfDownload = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("One Kitchen Financial Report", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(displayDateRange || "All Time", 105, 28, { align: 'center' });
        
        let y = 45;
        
        // Summary Section
        doc.setFontSize(14);
        doc.text("Summary", 14, y);
        y += 8;
        doc.setFontSize(12);
        doc.text(`Total Revenue: ${formatCurrency(totals.totalRevenue)}`, 14, y);
        y += 7;
        doc.text(`Total Expenses: ${formatCurrency(totals.totalExpenses)}`, 14, y);
        y += 7;
        doc.text(`Net Profit: ${formatCurrency(totals.netProfit)}`, 14, y);
        y += 12;

        // Revenue Section
        doc.setFontSize(16);
        doc.text("Revenue", 14, y);
        y += 8;
        doc.setFontSize(10);
        
        const sortedRevenues = [...revenues].sort((a,b) => new Date(a.date) - new Date(b.date));
        sortedRevenues.forEach(r => {
            if (y > 280) { doc.addPage(); y = 20; }
            const totalAmount = (parseFloat(r.checkAmount) || 0) + (parseFloat(r.cashAmount) || 0);
            const line = `${r.date} | ${r.source} | Check: ${formatCurrency(r.checkAmount)} | Cash: ${formatCurrency(r.cashAmount)}`;
            doc.text(line, 14, y);
            doc.text(formatCurrency(totalAmount), 195, y, { align: 'right' });
            y += 6;
        });

        y += 10;

        // Expenses Section
        doc.setFontSize(16);
        doc.text("Expenses", 14, y);
        y += 8;

        const groupedExpenses = expenses.reduce((acc, e) => {
            const category = e.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(e);
            return acc;
        }, {});

        Object.keys(groupedExpenses).sort().forEach(category => {
            if (y > 280) { doc.addPage(); y = 20; }
            y += 6;
            doc.setFontSize(12); // Smaller font for category
            doc.text(category, 14, y);
            y += 7;
            doc.setFontSize(10);
            
            const sortedExpenses = groupedExpenses[category].sort((a, b) => new Date(a.date) - new Date(b.date));

            sortedExpenses.forEach(e => {
                if (y > 280) { doc.addPage(); y = 20; }
                const line = `${e.date} | ${e.description || getVendorName(e.vendorId)} | ${e.paymentType || 'N/A'}`;
                doc.text(line, 14, y);
                doc.text(formatCurrency(e.amount), 195, y, { align: 'right' });
                y += 6;
            });
        });
        
        doc.save(`OneKitchen_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExcelDownload = () => {
        const wb = XLSX.utils.book_new();

        // Revenue Sheet
        const revenueData = [...revenues]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(r => ({
            Date: r.date,
            Vendor: r.source,
            Category: 'Revenue',
            'Pay Type': 'N/A',
            Desc: r.source,
            Amount: (r.checkAmount || 0) + (r.cashAmount || 0)
        }));
        const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
        XLSX.utils.book_append_sheet(wb, revenueSheet, "Revenue");

        // Expense Sheet
        const expenseData = [...expenses]
            .sort((a,b) => {
                if (a.category < b.category) return -1;
                if (a.category > b.category) return 1;
                return new Date(a.date) - new Date(b.date);
            })
            .map(e => ({
            Date: e.date,
            Vendor: getVendorName(e.vendorId),
            Category: e.category,
            'Pay Type': e.paymentType,
            Desc: e.description,
            Amount: e.amount || 0
        }));
        const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

        const summaryData = [
            { Category: "Total Revenue", Amount: totals.totalRevenue },
            { Category: "Total Expenses", Amount: totals.totalExpenses },
            { Category: "Net Profit", Amount: totals.netProfit },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
        
        XLSX.writeFile(wb, `OneKitchen_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-end gap-4">
                 <button onClick={handlePdfDownload} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Download PDF</button>
                 <button onClick={handleExcelDownload} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Download Excel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Total Revenue">
                    <p className="text-4xl font-bold text-green-400">{formatCurrency(totals.totalRevenue)}</p>
                </Card>
                <Card title="Total Expenses">
                    <p className="text-4xl font-bold text-red-400">{formatCurrency(totals.totalExpenses)}</p>
                </Card>
                <Card title="Net Profit">
                    <p className={`text-4xl font-bold ${totals.netProfit >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>{formatCurrency(totals.netProfit)}</p>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="Recent Revenue">
                    <ul className="space-y-3">
                        {revenues.length > 0 ? revenues.slice(0, 5).map(r => {
                            const totalAmount = (parseFloat(r.checkAmount) || 0) + (parseFloat(r.cashAmount) || 0);
                             return (
                                <li key={r.id} className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                                   <div>
                                       <p className="text-gray-300">{r.source}</p>
                                       <p className="text-xs text-gray-500">{r.date}</p>
                                   </div>
                                   <span className="text-green-400 font-semibold">{formatCurrency(totalAmount)}</span>
                                </li>
                             );
                        }) : <p className="text-gray-500">No revenue entries for this period.</p>}
                    </ul>
                 </Card>
                 <Card title="Recent Expenses">
                    <ul className="space-y-2">
                        {groupedRecentExpenses && groupedRecentExpenses.sortedCategories.length > 0 ? (
                            groupedRecentExpenses.sortedCategories.map(category => {
                                const group = groupedRecentExpenses.groups[category];
                                const isExpanded = expandedExpenseGroups[category];
                                return (
                                    <li key={category}>
                                        <div onClick={() => toggleExpenseGroup(category)} className="flex justify-between items-center p-2 bg-gray-700/40 rounded-md cursor-pointer hover:bg-gray-700/60">
                                            <div className="font-semibold text-gray-300">
                                                <span className="mr-2 text-indigo-400">{isExpanded ? '▼' : '►'}</span>
                                                {category}
                                            </div>
                                            <span className="font-semibold text-red-400">{formatCurrency(group.total)}</span>
                                        </div>
                                        {isExpanded && (
                                            <ul className="pl-4 mt-2 space-y-3 pt-2">
                                                {group.transactions.map(e => (
                                                    <li key={e.id} className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                                                    <div>
                                                        <p className="text-gray-300">{getExpenseDisplayLine(e)}</p>
                                                        <p className="text-xs text-gray-500">{e.date}</p>
                                                    </div>
                                                    <span className="text-red-400 font-semibold">{formatCurrency(e.amount)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                )
                            })
                        ) : (
                            <p className="text-gray-500">No expense entries for this period.</p>
                        )}
                    </ul>
                 </Card>
            </div>
        </div>
    );
}

function CrudView({ title, data, db, userId, appId, collectionName, fields, formatCurrency, vendors }) {
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [itemToDelete, setItemToDelete] = useState(null);
    const [addMode, setAddMode] = useState('single'); // 'single', 'multiple', 'wages'
    const [vendorNameInput, setVendorNameInput] = useState('');
    const [expenseRows, setExpenseRows] = useState([]);
    const [payPeriods, setPayPeriods] = useState([]);
    const [rowErrors, setRowErrors] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [showStatementUpload, setShowStatementUpload] = useState(false);

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const groupedExpenses = useMemo(() => {
        if (collectionName !== 'expenses' || !data) {
            return null;
        }
        const groups = data.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = {
                    transactions: [],
                    total: 0,
                };
            }
            acc[category].transactions.push(expense);
            acc[category].total += parseFloat(expense.amount || 0);
            return acc;
        }, {});

        const sortedCategories = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);

        return { groups, sortedCategories };
    }, [data, collectionName]);

     const handleBatchSave = async (transactions) => {
        if (!db || !userId || transactions.length === 0) return;

        const batch = writeBatch(db);
        const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

        transactions.forEach(t => {
            const docRef = doc(expensesCollection);
            const matchedVendor = vendors.find(v => v.name.toLowerCase() === t.vendor.toLowerCase());

            const dataToSave = {
                date: t.date || '',
                vendorId: null,
                category: t.category || 'General Expense',
                amount: parseFloat(t.amount || 0),
                paymentType: t.paymentType || 'CC',
                reportable: t.reportable !== false,
                description: t.description,
            };

            if (matchedVendor) {
                dataToSave.vendorId = matchedVendor.id;
            } else {
                dataToSave.description = `${t.vendor}---${t.description}`;
            }

            batch.set(docRef, dataToSave);
        });

        try {
            await batch.commit();
            setShowStatementUpload(false);
        } catch (error) {
            console.error("Error batch saving expenses:", error);
        }
    };

    const getInitialFormData = (mode) => {
        const initialData = fields.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
        if (fields.includes('reportable')) {
            initialData.reportable = true;
        }
        if (fields.includes('date')) {
            initialData.date = new Date().toISOString().split('T')[0];
        }
        if (mode === 'wages') {
            initialData.category = 'Wages';
        }
        if (mode === 'multiple' && collectionName === 'expenses') {
            initialData.vendorName = '';
        }
        return initialData;
    }

    useEffect(() => {
        if (collectionName === 'expenses') {
             const generatePayPeriods = () => {
                const periods = [];
                const today = new Date();
                let lastSunday = new Date(today);
                lastSunday.setDate(today.getDate() - today.getDay());
                lastSunday.setHours(12, 0, 0, 0); // Use noon to avoid timezone rollover issues

                for (let i = 0; i < 13; i++) { // 13 periods = approx 6 months
                    const endDate = new Date(lastSunday);
                    const startDate = new Date(lastSunday);
                    startDate.setDate(startDate.getDate() - 13);

                    const formatDate = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;

                    const label = `${formatDate(startDate)}-${formatDate(endDate)}`;
                    const value = endDate.toISOString().split('T')[0];

                    periods.push({ label, value });
                    lastSunday.setDate(lastSunday.getDate() - 14);
                }
                return periods;
            };
            setPayPeriods(generatePayPeriods());
        }
    }, [collectionName]);

    useEffect(() => {
        if (editingItem) {
            setAddMode('single');
            const itemData = { ...editingItem };
            if (fields.includes('reportable') && typeof itemData.reportable === 'undefined') {
                itemData.reportable = true;
            }
            setFormData(itemData);
            if (itemData.vendorId && vendors && vendors.length > 0) {
                const vendor = vendors.find(v => v.id === itemData.vendorId);
                setVendorNameInput(vendor ? vendor.name : '');
            } else {
                setVendorNameInput('');
            }
            setShowForm(true);
        } else {
             setFormData(getInitialFormData(addMode));
             setVendorNameInput('');
             if (addMode === 'multiple') {
                setExpenseRows(Array(10).fill().map(() => getInitialFormData('multiple')));
             }
        }
    }, [editingItem, fields, collectionName, showForm, vendors]); // Rerun when form is opened
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        let newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

        if (name === 'vendorId' && collectionName === 'expenses' && vendors) {
            const selectedVendor = vendors.find(v => v.id === value);
            if (selectedVendor) {
                newFormData.category = selectedVendor.category || '';
            } else {
                newFormData.category = '';
            }
        }
        setFormData(newFormData);
    };

    const handleVendorInputChange = (e) => {
        const name = e.target.value;
        setVendorNameInput(name);

        const selectedVendor = vendors.find(v => v.name.toLowerCase() === name.toLowerCase());
        if (selectedVendor) {
            setFormData(prev => ({
                ...prev,
                vendorId: selectedVendor.id,
                category: selectedVendor.category || prev.category,
            }));
        } else {
            setFormData(prev => ({ ...prev, vendorId: '' }));
        }
    };

     const handleMultipleInputChange = (index, e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'vendorName') { // Special handling for the vendor input
            const newRows = [...expenseRows];
            newRows[index].vendorName = value;
    
            const selectedVendor = vendors.find(v => v.name.toLowerCase() === value.toLowerCase());
            if (selectedVendor) {
                newRows[index].vendorId = selectedVendor.id;
                newRows[index].category = selectedVendor.category || newRows[index].category || '';
            } else {
                newRows[index].vendorId = '';
            }
            setExpenseRows(newRows);
        } else { // Generic handling for all other inputs
            const newRows = [...expenseRows];
            newRows[index][name] = type === 'checkbox' ? checked : value;
            setExpenseRows(newRows);
        }
    };

    const addExpenseRow = () => {
        setExpenseRows([...expenseRows, getInitialFormData('multiple')]);
    };

    const removeExpenseRow = (index) => {
        const newRows = expenseRows.filter((_, i) => i !== index);
        setExpenseRows(newRows);
    };

    const handleKeyDown = (e, field, index) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();

        const fieldOrder = ['date', 'vendorId', 'category', 'amount', 'paymentType', 'description', 'reportable'];
        const currentFieldIndex = fieldOrder.indexOf(field);

        let nextField, nextIndex;
        if (e.shiftKey) { // Backwards
            if (index > 0) {
                nextField = field;
                nextIndex = index - 1;
            } else { // at the top of a column
                if (currentFieldIndex > 0) {
                    nextField = fieldOrder[currentFieldIndex - 1];
                    nextIndex = expenseRows.length - 1;
                } else {
                    return; // at very first element
                }
            }
        } else { // Forwards
            if (index < expenseRows.length - 1) {
                nextField = field;
                nextIndex = index + 1;
            } else { // at the bottom of a column
                if (currentFieldIndex < fieldOrder.length - 1) {
                    nextField = fieldOrder[currentFieldIndex + 1];
                    nextIndex = 0;
                } else {
                     const addRowButton = document.getElementById('add-expense-row-button');
                    if (addRowButton) addRowButton.focus();
                    return;
                }
            }
        }
        
        const nextElementId = `${nextField}-${nextIndex}`;
        const nextElement = document.getElementById(nextElementId);
        if (nextElement) {
            nextElement.focus();
            if (nextElement.select) {
                 nextElement.select();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;

        if (collectionName === 'expenses' && addMode === 'wages' && !editingItem) {
            const { payPeriod, payrollAmount, payrollTax, cash } = formData;
            const payrollVendor = vendors.find(v => v.name === 'Sure Payroll');
            const payrollVendorId = payrollVendor ? payrollVendor.id : null;

            if (!payPeriod || (!payrollAmount && !payrollTax && !cash)) {
                console.error("Pay period and at least one amount are required.");
                return;
            }
            
            const selectedPeriod = payPeriods.find(p => p.value === payPeriod);
            const periodLabel = selectedPeriod ? selectedPeriod.label : '';

            const batch = writeBatch(db);
            const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

            if (parseFloat(payrollAmount || 0) > 0) {
                const docRef = doc(expensesCollection);
                batch.set(docRef, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(payrollAmount), paymentType: 'Bank Transfer', reportable: true, description: `Pay Period: ${periodLabel}` });
            }
            if (parseFloat(payrollTax || 0) > 0) {
                const docRef = doc(expensesCollection);
                batch.set(docRef, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(payrollTax), paymentType: 'Bank Transfer', reportable: true, description: `Payroll Tax: ${periodLabel}` });
            }
            if (parseFloat(cash || 0) > 0) {
                 const docRef = doc(expensesCollection);
                batch.set(docRef, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(cash), paymentType: 'Cash', reportable: false, description: `Cash Payroll: ${periodLabel}` });
            }
            
            try {
                await batch.commit();
                closeForm();
            } catch (error) {
                console.error("Error saving wage entries:", error);
            }
            return;
        }


        if (collectionName === 'expenses' && addMode === 'multiple' && !editingItem) {
            const rowsWithAmount = expenseRows.filter(row => parseFloat(row.amount || 0) > 0);
            
            const invalidRows = rowsWithAmount.filter(row => !row.vendorName || !row.category || !row.paymentType);
            const errorIndices = invalidRows.map(row => expenseRows.indexOf(row));
            setRowErrors(errorIndices);

            if (invalidRows.length > 0) {
                console.error("Validation failed for some rows. Please complete all required fields for entries with an amount.");
                // We still proceed to save the valid ones.
            }

            const validRowsToSave = rowsWithAmount.filter(row => row.vendorName && row.category && row.paymentType);

            if (validRowsToSave.length === 0) {
                if(invalidRows.length === 0) console.log("No expense rows to save.");
                if (invalidRows.length > 0) return; // if there are errors but nothing to save, stay on form
                closeForm();
                return;
            }

            const batch = writeBatch(db);
            const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);
            
            validRowsToSave.forEach(row => {
                 const docRef = doc(expensesCollection);
                 const dataToSave = {
                     date: row.date,
                     vendorId: row.vendorId,
                     category: row.category,
                     amount: parseFloat(row.amount || 0),
                     paymentType: row.paymentType,
                     reportable: !!row.reportable,
                     description: row.description,
                 };

                 if (!dataToSave.vendorId && row.vendorName) {
                    dataToSave.vendorId = null;
                    dataToSave.description = dataToSave.description
                        ? `${row.vendorName}---${dataToSave.description}`
                        : row.vendorName;
                 }

                 batch.set(docRef, dataToSave);
            });

            try {
                await batch.commit();
                closeForm();
            } catch (error) {
                console.error("Error saving multiple expenses: ", error);
            }
            return;
        }

        if (collectionName === 'revenues' && !editingItem) {
            const { source, date } = formData;
            const checkAmount = parseFloat(formData.checkAmount || 0);
            const cashAmount = parseFloat(formData.cashAmount || 0);
            const operations = [];

            if (checkAmount > 0) {
                operations.push(addDoc(collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`), {
                    source, date, checkAmount, cashAmount: 0, reportable: true
                }));
            }
            if (cashAmount > 0) {
                operations.push(addDoc(collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`), {
                    source, date, checkAmount: 0, cashAmount, reportable: false
                }));
            }
            try {
                await Promise.all(operations);
                closeForm();
            } catch (error) {
                console.error("Error creating revenue entries: ", error);
            }
            return; 
        }

        const dataToSave = { ...formData };
        
        if (collectionName === 'expenses' && (addMode === 'single' || editingItem)) {
            if (!dataToSave.vendorId && vendorNameInput) {
                dataToSave.vendorId = null;
                dataToSave.description = dataToSave.description
                    ? `${vendorNameInput}---${dataToSave.description}`
                    : vendorNameInput;
            }
        }
        
        if (dataToSave.amount) dataToSave.amount = parseFloat(dataToSave.amount || 0);
        if (dataToSave.checkAmount) dataToSave.checkAmount = parseFloat(dataToSave.checkAmount || 0);
        if (dataToSave.cashAmount) dataToSave.cashAmount = parseFloat(dataToSave.cashAmount || 0);
        if (fields.includes('reportable')) {
            dataToSave.reportable = !!dataToSave.reportable;
        }

        try {
            if (editingItem) {
                const docRef = doc(db, `/artifacts/${appId}/users/${userId}/${collectionName}`, editingItem.id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`), dataToSave);
            }
            closeForm();
        } catch (error) {
            console.error("Error saving document: ", error);
        }
    };
    
    const handleDelete = (id) => {
        setItemToDelete(id);
    };

    const confirmDelete = async () => {
        if (!db || !userId || !itemToDelete) return;
        try {
            await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/${collectionName}`, itemToDelete));
            setItemToDelete(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
            setItemToDelete(null);
        }
    };

    const cancelDelete = () => {
        setItemToDelete(null);
    };

    const openForm = (item = null, mode = 'single') => {
        setEditingItem(item);
        setRowErrors([]);
        const effectiveMode = item ? 'single' : mode;
        setAddMode(effectiveMode);
        if (effectiveMode === 'multiple') {
            setExpenseRows(Array(10).fill().map(() => getInitialFormData('multiple')));
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setExpenseRows([]); // Reset multiple rows form
        setRowErrors([]);
    };

    const getVendorName = (vendorId) => {
        if (!vendors || !vendorId) return 'N/A';
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : 'Unknown Vendor';
    };
    
    const getCategoryName = (item) => {
        if(collectionName === 'expenses' && item.vendorId && !item.category) {
            const vendor = vendors.find(v => v.id === item.vendorId);
            return vendor ? vendor.category : 'N/A';
        }
        return item.category || 'N/A';
    }

    const multipleExpensesTotal = useMemo(() => {
        return expenseRows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    }, [expenseRows]);

    const paymentPercentages = useMemo(() => {
        if (multipleExpensesTotal === 0) {
            return { check: 0, cash: 0 };
        }
        const checkTotal = expenseRows
            .filter(row => row.paymentType === 'Check')
            .reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
        const cashTotal = expenseRows
            .filter(row => row.paymentType === 'Cash')
            .reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
        
        return {
            check: (checkTotal / multipleExpensesTotal) * 100,
            cash: (cashTotal / multipleExpensesTotal) * 100,
        };
    }, [expenseRows, multipleExpensesTotal]);


    const renderField = (field, customData, onChangeCallback, index, onKeyDownCallback, hasError) => {
        const data = customData || formData;
        const onChange = onChangeCallback || handleInputChange;
        const fieldId = `${field}-${index}`;

        const getRequiredStatus = (f) => {
            if (collectionName === 'vendors') return ['name', 'category'].includes(f);
            if(collectionName === 'expenses') {
                if(addMode === 'multiple') return false; // validation is handled manually for multi-add
                return ['date', 'vendorId', 'category', 'amount', 'paymentType'].includes(f);
            }
            if (['checkAmount', 'cashAmount', 'amount'].includes(f)) return false;
            return true; 
        };

        const commonProps = {
            name: field,
            id: fieldId,
            onChange: onChange,
            className: `shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${hasError ? 'border-red-500' : 'border-gray-600'}`,
            ...(onKeyDownCallback && { onKeyDown: (e) => onKeyDownCallback(e, field, index) })
        };
    
        switch(field) {
             case 'reportable':
                return (
                    <div className="flex items-center justify-center h-full">
                        <input type="checkbox" id={fieldId} name={field} checked={!!data[field]} onChange={onChange} className="h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500 rounded" />
                    </div>
                );
            case 'source':
                return (
                    <select {...commonProps} value={data[field] || ''} required>
                        <option value="">Select Source</option>
                        <option value="DFC-Hacienda Hts">DFC-Hacienda Hts</option>
                        <option value="DFC-Rosemead">DFC-Rosemead</option>
                    </select>
                );
            case 'paymentType':
                 return (
                    <select {...commonProps} value={data[field] || ''} required={getRequiredStatus(field)}>
                        <option value="">Select Type</option>
                        <option value="Check">Check</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="CC">CC</option>
                    </select>
                );
            case 'category':
                const isWages = addMode === 'wages' && !editingItem;
                return (
                    <select {...commonProps} value={data[field] || ''} disabled={isWages} required={getRequiredStatus(field)}>
                        <option value="">Select Category</option>
                        <option value="Wages">Wages</option>
                        <option value="COGS">COGS</option>
                        <option value="Rent">Rent</option>
                        <option value="Utilities">Utilities</option>
                        <option value="General Expense">General Expense</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Maintenance & Repair">Maintenance & Repair</option>
                        <option value="Fees & Licenses">Fees & Licenses</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Auto & Travel">Auto & Travel</option>
                    </select>
                );
            case 'vendorId':
                 if (addMode === 'wages' && !editingItem) return null;
                 
                 if (addMode === 'single' || editingItem) {
                    return (
                        <>
                            <input
                                list="vendors-list"
                                name="vendorName"
                                id={fieldId}
                                className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-600`}
                                value={vendorNameInput}
                                onChange={handleVendorInputChange}
                                required={getRequiredStatus(field)}
                                placeholder="Type or select a vendor"
                            />
                            <datalist id="vendors-list">
                                {vendors.map(v => <option key={v.id} value={v.name} />)}
                            </datalist>
                        </>
                    );
                 }
                 
                 // Fallback for multiple-add mode - now a typeahead input
                 return (
                    <>
                        <input
                            list="vendors-list-multi"
                            name="vendorName"
                            id={fieldId}
                            className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${hasError ? 'border-red-500' : 'border-gray-600'}`}
                            value={data.vendorName || ''}
                            onChange={(e) => onChange(index, e)}
                            onKeyDown={(e) => onKeyDownCallback(e, 'vendorId', index)}
                            placeholder="Type or select a vendor"
                        />
                        <datalist id="vendors-list-multi">
                            {vendors.map(v => <option key={v.id} value={v.name} />)}
                        </datalist>
                    </>
                 );
            case 'date':
                if (collectionName === 'revenues') {
                    return <input type="month" {...commonProps} value={data[field] || ''} required />;
                }
                return <input type="date" {...commonProps} value={data[field] || ''} required />;
            case 'checkAmount':
            case 'cashAmount':
            case 'amount':
                return <input type="number" step="0.01" {...commonProps} value={data[field] || ''} />;
            case 'email':
                return <input type="email" {...commonProps} value={data[field] || ''} />;
            case 'phoneNumber':
                return <input type="tel" {...commonProps} value={data[field] || ''} />;
            default:
                return <input type="text" {...commonProps} value={data[field] || ''} />;
        }
    }

    const renderFormContent = () => {
        if (addMode === 'multiple' && collectionName === 'expenses' && !editingItem) {
            return (
                 <form onSubmit={handleSubmit}>
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="w-full text-left table-auto">
                            <thead className="sticky top-0 bg-gray-800">
                                <tr className="border-b border-gray-700/50">
                                    <th className="p-2 text-sm font-semibold text-gray-400">Date</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Vendor</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Category</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Amount</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Payment</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Description</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400 text-center">Reportable</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseRows.map((row, index) => {
                                    const isRowInError = rowErrors.includes(index);
                                    return (
                                        <tr key={index} className="border-b border-gray-700/50">
                                            <td className="p-1">{renderField('date', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, false)}</td>
                                            <td className="p-1">{renderField('vendorId', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, isRowInError && !row.vendorName)}</td>
                                            <td className="p-1">{renderField('category', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, isRowInError && !row.category)}</td>
                                            <td className="p-1">{renderField('amount', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, isRowInError)}</td>
                                            <td className="p-1">{renderField('paymentType', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, isRowInError && !row.paymentType)}</td>
                                            <td className="p-1">{renderField('description', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, false)}</td>
                                            <td className="p-1">{renderField('reportable', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, false)}</td>
                                            <td className="p-1">
                                                <button type="button" onClick={() => removeExpenseRow(index)} className="text-red-500 hover:text-red-400">
                                                    <XIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <button type="button" onClick={addExpenseRow} id="add-expense-row-button" className="text-indigo-400 hover:text-indigo-300 font-bold py-2 px-4 rounded">
                            + Add Row
                        </button>
                        <div className="text-right flex items-center gap-6">
                             <div>
                                <span className="text-gray-400 font-semibold">% Check: </span>
                                <span className="text-lg font-bold text-white">{paymentPercentages.check.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-semibold">% Cash: </span>
                                <span className="text-lg font-bold text-white">{paymentPercentages.cash.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-semibold">Total Amount: </span>
                                <span className="text-xl font-bold text-white">{formatCurrency(multipleExpensesTotal)}</span>
                            </div>
                        </div>
                    </div>
                    {rowErrors.length > 0 && (
                        <p className="text-center text-red-400 mt-4">Please complete the highlighted fields for all expenses with an amount.</p>
                    )}
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Save All</button>
                    </div>
                </form>
            );
        }
        
        if (addMode === 'wages' && collectionName === 'expenses' && !editingItem) {
             return (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payPeriod">Pay Period</label>
                        <select id="payPeriod" name="payPeriod" value={formData.payPeriod || ''} onChange={handleInputChange} className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                            <option value="">Select a pay period</option>
                            {payPeriods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payrollAmount">Payroll Amount</label>
                        <input type="number" step="0.01" id="payrollAmount" name="payrollAmount" value={formData.payrollAmount || ''} onChange={handleInputChange} className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payrollTax">Payroll Tax</label>
                        <input type="number" step="0.01" id="payrollTax" name="payrollTax" value={formData.payrollTax || ''} onChange={handleInputChange} className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="cash">Cash</label>
                        <input type="number" step="0.01" id="cash" name="cash" value={formData.cash || ''} onChange={handleInputChange} className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                    </div>
                </form>
            );
        }


        const currentFields = (collectionName === 'revenues' && !editingItem) 
            ? fields.filter(f => f !== 'reportable')
            : fields;


        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                {currentFields.map(field => {
                    const fieldElement = renderField(field, formData, handleInputChange);
                    if (!fieldElement) return null;
                    
                    if (field === 'reportable' && (addMode === 'single' || addMode === 'wages' || editingItem)) {
                        return (
                            <div key={field} className="flex items-center pt-2">
                                 <input
                                    type="checkbox"
                                    id="reportable-single"
                                    name="reportable"
                                    checked={!!formData.reportable}
                                    onChange={handleInputChange}
                                    className="h-5 w-5 bg-gray-70omiGg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500 rounded"
                                />
                                <label htmlFor="reportable-single" className="ml-3 text-gray-300">Reportable</label>
                            </div>
                        );
                    }
                     if (field === 'reportable') return null; 

                    return (
                        <div key={field}>
                            <label className="block text-gray-400 text-sm font-bold mb-2 capitalize" htmlFor={field}>
                                {field.replace(/([A-Z])/g, ' $1').replace('Id', '')}
                            </label>
                            {fieldElement}
                        </div>
                    );
                })}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                </div>
            </form>
        );
    };

    const renderItemRow = (item, isSubRow = false) => {
        const vendorName = getVendorName(item.vendorId);
        let displayVendor = vendorName;
        let displayDescription = item.description;

        if (!item.vendorId && item.description && item.description.includes('---')) {
            const parts = item.description.split('---');
            displayVendor = parts[0];
            displayDescription = parts[1];
        }

        return (
            <tr key={item.id} className={`border-b border-gray-800 hover:bg-gray-700/20 ${isSubRow ? 'bg-gray-800/40' : ''}`}>
                {fields.map((field, index) => (
                    <td key={field} className={`p-4 text-gray-300 ${isSubRow && index === 0 ? 'pl-10' : ''}`}>
                        {
                            field === 'reportable' ? (item.reportable ? <CheckIcon /> : <XIcon />)
                            : (field === 'amount' || field === 'checkAmount' || field === 'cashAmount') ? formatCurrency(item[field]) 
                            : field === 'vendorId' ? displayVendor
                            : field === 'category' ? getCategoryName(item)
                            : field === 'description' ? displayDescription
                            : item[field]
                        }
                    </td>
                ))}
                <td className="p-4 flex gap-4 items-center">
                    <button onClick={() => openForm(item)} className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200"><EditIcon /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 transition-colors duration-200"><DeleteIcon /></button>
                </td>
            </tr>
        );
    };

    return (
        <>
            <Card title={`${title} Records`}>
                <div className="flex justify-end flex-wrap mb-6 gap-4">
                    {collectionName === 'expenses' ? (
                        <>
                            <button onClick={() => openForm(null, 'single')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"> <PlusIcon /> Add Single Expense </button>
                            <button onClick={() => openForm(null, 'multiple')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"> <PlusIcon /> Add Multiple Expenses </button>
                            <button onClick={() => openForm(null, 'wages')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"> <PlusIcon /> Add Wages </button>
                            <button onClick={() => setShowStatementUpload(true)} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg"> <PlusIcon /> Add CC/Bank Statement </button>
                        </>
                    ) : (
                        <button onClick={() => openForm()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"> <PlusIcon /> Add {title} </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left table-auto">
                        <thead>
                            <tr className="border-b border-gray-700/50">
                                {fields.map(f => <th key={f} className="p-4 capitalize text-sm font-semibold text-gray-400">{f.replace(/([A-Z])/g, ' $1').replace('Id', '')}</th>)}
                                <th className="p-4 text-sm font-semibold text-gray-400">Actions</th>
                            </tr>
                        </thead>
                         <tbody>
                            { data && data.length > 0 ? (
                                collectionName === 'expenses' && groupedExpenses ? (
                                    groupedExpenses.sortedCategories.map(category => {
                                        const group = groupedExpenses.groups[category];
                                        const isExpanded = expandedGroups[category];
                                        return (
                                            <React.Fragment key={category}>
                                                <tr className="bg-gray-700/30 font-semibold cursor-pointer hover:bg-gray-700/50" onClick={() => toggleGroup(category)}>
                                                    <td className="p-4" colSpan={fields.length}>
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <span className="mr-3 text-lg text-indigo-400">{isExpanded ? '▼' : '►'}</span>
                                                                {category} ({group.transactions.length})
                                                            </div>
                                                            <span className="font-bold text-lg">{formatCurrency(group.total)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4"></td>
                                                </tr>
                                                {isExpanded && group.transactions.map(item => renderItemRow(item, true))}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    data.map(item => renderItemRow(item))
                                )
                            ) : (
                                <tr>
                                    <td colSpan={fields.length + 1} className="text-center p-8 text-gray-500">No {title.toLowerCase()} records found for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showForm && (
                <div onClick={closeForm} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start z-50 p-4 pt-12 md:pt-24 overflow-y-auto">
                    <div onClick={(e) => e.stopPropagation()} className={`bg-gray-800 p-8 rounded-xl shadow-2xl w-full ${addMode === 'multiple' ? 'max-w-7xl' : 'max-w-lg'} border border-gray-700`}>
                        <h2 className="text-2xl font-bold mb-6 text-white">
                           {editingItem ? `Edit ${title}` : 
                                collectionName === 'expenses' ? 
                                (addMode === 'single' ? 'Add Single Expense' :
                                 addMode === 'multiple' ? 'Add Multiple Expenses' : 'Add Wages') :
                                `Add ${title}`
                           }
                        </h2>
                       {renderFormContent()}
                    </div>
                </div>
            )}

            {showStatementUpload && (
                 <StatementUploadModal
                    onClose={() => setShowStatementUpload(false)}
                    onSave={handleBatchSave}
                    existingExpenses={data}
                    formatCurrency={formatCurrency}
                 />
            )}

            {itemToDelete && (
                 <div onClick={cancelDelete} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div onClick={(e) => e.stopPropagation()} className={`bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-gray-700`}>
                        <h2 className="text-2xl font-bold mb-4 text-white">Confirm Deletion</h2>
                        <p className="text-gray-300 mb-8">Are you sure you want to delete this item? This action cannot be undone.</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={cancelDelete} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// --- New Component for Statement Upload ---
function StatementUploadModal({ onClose, onSave, existingExpenses, formatCurrency }) {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [accountInfo, setAccountInfo] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setError('');
            setTransactions([]); // Reset on new file select
            setAccountInfo(null);
        } else {
            setFile(null);
            setError('Please select a valid CSV file.');
        }
    };

    const categoryKeywords = {
        'COGS': ['supermarket', 'smart and final', '99 ranch', 'grocery', 'restaurant depot'],
        'Supplies': ['costco', 'amazon', 'daiso', 'staples', 'home depot', 'dollar tree'],
        'Utilities': ['verizon', 't-mobile', 'edison', 'sce', 'so cal gas', 'socalgas', 'spectrum'],
        'Insurance': ['geico', 'state farm', 'allstate'],
        'Maintenance & Repair': ['auto zone', 'o\'reilly'],
        'Professional Services': ['google gsuite', 'cognito-team', 'chatgpt', 'big star', 'aaa ca membership'],
        'Auto & Travel': ['costco gas', 'gas'],
        'General Expense': [
            'uep*shancheng lameizi', 
            'wingstop', 
            'panera', 
            'bouncie', 
            'chinatown express inc', 
            'ono'
        ],
    };

    const autoCategorize = (vendor, defaultCategory = 'General Expense') => {
        const vendorLower = vendor.toLowerCase();
        // Specific checks for ambiguous vendors first
        if (vendorLower.includes('costco gas')) {
            return 'Auto & Travel';
        }
        for (const category in categoryKeywords) {
            if (categoryKeywords[category].some(keyword => vendorLower.includes(keyword))) {
                return category;
            }
        }
        return defaultCategory;
    };

    const processTransactions = (parsedData) => {
        const transactionsWithDuplicates = parsedData.map((p, index) => {
            const isDuplicate = existingExpenses.some(e => {
                const sameDate = e.date === p.date;
                const sameAmount = Math.abs(parseFloat(e.amount) - p.amount) < 0.01;
                return sameDate && sameAmount;
            });
            return { ...p, id: `parsed-${index}`, selected: p.selected && !isDuplicate, isDuplicate };
        });
        setTransactions(transactionsWithDuplicates);
    };

    const parseBiltCsv = (csvText) => {
        setAccountInfo({ bank: 'Bilt', name: 'Mastercard', number: '7559' });
        const lines = csvText.trim().split('\n');
        
        // Handle optional header
        if (lines.length > 0 && lines[0].toLowerCase().includes('transaction date')) {
            lines.shift(); 
        }

        const parsed = [];
        const paymentKeywords = ['cc pymt', 'online ach payment', 'bps*bilt rewards'];

        lines.forEach(line => {
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
            if (values.length < 5) return;
            
            const amountStr = values[1];
            const vendor = values[4];
            
            if (!amountStr) return;

            const amount = parseFloat(amountStr);

            // Filter out payments and credits
            if (amount >= 0) return; 
            if (paymentKeywords.some(keyword => vendor.toLowerCase().includes(keyword))) {
                return;
            }

            const dateStr = values[0];
            const dateParts = dateStr.split('/');
            if (dateParts.length !== 3) return;
            
            let [month, day, year] = dateParts;

            // Handle both YY and YYYY date formats
            if (year.length === 2) {
                year = `20${year}`;
            }
            
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            parsed.push({
                date: formattedDate,
                vendor: vendor,
                amount: Math.abs(amount),
                category: autoCategorize(vendor),
                paymentType: 'CC',
                description: 'Bilt x7559',
                reportable: true,
                selected: true,
            });
        });
        return parsed;
    };

    const parseNuVisionCsv = (csvText) => {
        const lines = csvText.trim().split('\n');
        const header = lines.shift();
        if (!header.includes('Account Number')) throw new Error("Invalid NuVision CSV format.");
      
        const firstRowValues = lines[0].split(',').map(v => v.replace(/"/g, '').trim());
        const fullAccountNum = firstRowValues[0];
        setAccountInfo({ bank: 'NuVision', name: 'One Kitchen LLC', number: fullAccountNum.slice(-4) });
      
        const parsed = [];
        const checkAmountsToDeselect = [1116.58, 1132.54];
        const deselectionKeywords = ['credit card payment', 'payroll service akbb', 'trnsfr', 'wells fargo credit card'];
      
        lines.forEach(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          if (values.length < 6) return;
      
          const debitStr = values[4];
          const description = values[3];
          const isCheck = !!values[2];
          let shouldDeselect = false;
      
          if (debitStr && debitStr.trim() !== '') {
            const debit = parseFloat(debitStr);
            if (debit > 0) {
              if (deselectionKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
                shouldDeselect = true;
              }
      
              if (isCheck && checkAmountsToDeselect.some(amount => Math.abs(debit - amount) <= 0.25)) {
                shouldDeselect = true;
              }

              const descriptionLower = description.toLowerCase();
              let category;
    
              if (descriptionLower.includes('tesla mot')) {
                  category = 'Auto & Travel';
              } else if (descriptionLower.includes('s j distributor')) {
                  category = 'COGS';
              } else if (descriptionLower.includes('tom quan')) {
                  category = 'Rent';
              } else if (descriptionLower.includes('california department of motor')) {
                  category = 'Auto & Travel';
              } else if (descriptionLower.includes('sysco')) {
                  category = 'COGS';
              } else if (isCheck) {
                  category = 'COGS';
              } else {
                 category = autoCategorize(description, values[8] || 'General Expense');
              }
      
              const [month, day, year] = values[1].split('/');
              parsed.push({
                date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
                vendor: description.replace(/&amp;/g, '&'),
                amount: debit,
                category: category,
                paymentType: isCheck ? 'Check' : 'Bank Transfer',
                description: `NuVision x${fullAccountNum.slice(-4)}`,
                reportable: true,
                selected: !shouldDeselect,
              });
            }
          }
        });
        return parsed;
      };

    const parseCapitalOneCsv = (csvText) => {
        const lines = csvText.trim().split('\n');
        lines.shift();
        const firstRowValues = lines[0].split(',');
        const cardNum = firstRowValues[2];
        setAccountInfo({ bank: 'Capital One', name: 'One Kitchen LLC', number: cardNum });
        
        const parsed = [];
        lines.forEach(line => {
            const values = line.split(',');
            if (values.length < 6 || !values[5] || values[4].toLowerCase() === 'payment/credit') return; // Must have a debit, not a payment

            const debit = parseFloat(values[5]);
            if (debit > 0) {
                 parsed.push({
                    date: values[0], // Already YYYY-MM-DD
                    vendor: values[3],
                    amount: debit,
                    category: autoCategorize(values[3], values[4] || 'General Expense'),
                    paymentType: 'CC',
                    description: `Capital One x${cardNum}`,
                    reportable: true,
                    selected: true,
                 });
            }
        });
        return parsed;
    };


    const handleParse = () => {
        if (!file) return;
        setIsLoading(true);
        setError('');
        setTransactions([]);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                let parsedData = [];

                // Detect file type based on header or content
                if (csvText.includes('"Transaction Date","Amount","Reward Multiplier"') || csvText.includes('BPS*BILT REWARDS')) {
                    parsedData = parseBiltCsv(csvText);
                } else if (csvText.includes('Account Number,Post Date,Check,Description,Debit,Credit')) {
                    parsedData = parseNuVisionCsv(csvText);
                } else if (csvText.includes('Transaction Date,Posted Date,Card No.')) {
                    parsedData = parseCapitalOneCsv(csvText);
                } else {
                    throw new Error("Unsupported CSV file format.");
                }

                if (parsedData.length === 0) {
                    setError('No valid expense transactions were found in the file.');
                }
                processTransactions(parsedData);
            } catch (err) {
                console.error(err);
                setError(err.message || 'An error occurred while parsing the file.');
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setIsLoading(false);
            setError('Failed to read the file.');
        };
        reader.readAsText(file);
    };

    const handleTransactionChange = (id, field, value) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleSaveClick = () => {
        const selectedTransactions = transactions.filter(t => t.selected);
        onSave(selectedTransactions);
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start z-50 p-4 pt-12 md:pt-24 overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className={`bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-6xl border border-gray-700`}>
                <h2 className="text-2xl font-bold mb-4 text-white">Add CC/Bank Statement</h2>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6">
                    <h3 className="font-semibold text-indigo-400">Instructions:</h3>
                    <p className="text-gray-400 text-sm mt-2">Attach one of 3 files: Bilt Mastercard x7559, Capital One Visa x2364, or NuVision Bank Statement x7150. Download Transactions in a CSV format.</p>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"/>
                    <button onClick={handleParse} disabled={!file || isLoading} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                        {isLoading ? 'Parsing...' : 'Parse File'}
                    </button>
                </div>
                 {accountInfo && (
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6 flex justify-around text-center">
                        <div><span className="font-semibold block text-gray-400">Bank/Issuer</span>{accountInfo.bank}</div>
                        <div><span className="font-semibold block text-gray-400">Account Name</span>{accountInfo.name}</div>
                        <div><span className="font-semibold block text-gray-400">Account Number</span>xxxx-{accountInfo.number}</div>
                    </div>
                )}


                {error && <p className="text-red-400 text-center mb-4">{error}</p>}

                {transactions.length > 0 && (
                    <div className="overflow-y-auto max-h-[40vh]">
                        <table className="w-full text-left text-sm">
                             <thead className="sticky top-0 bg-gray-800">
                                <tr className="border-b border-gray-700">
                                    <th className="p-2"><input type="checkbox" checked={transactions.every(t => t.selected)} onChange={e => setTransactions(transactions.map(t => ({...t, selected: e.target.checked})))} /></th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2 w-1/3">Vendor</th>
                                    <th className="p-2">Amount</th>
                                    <th className="p-2">Category</th>
                                    <th className="p-2">Payment Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => {
                                    const allCategories = [ "Wages", "COGS", "Rent", "Utilities", "General Expense", "Insurance", "Maintenance & Repair", "Fees & Licenses", "Professional Services", "Supplies", "Auto & Travel"];
                                    const availableCategories = (accountInfo?.bank === 'Bilt' || accountInfo?.bank === 'Capital One')
                                        ? allCategories.filter(c => c !== 'Wages')
                                        : allCategories;

                                    return (
                                     <tr key={t.id} className={`border-b border-gray-700/50 transition-colors duration-200 ${!t.selected ? 'text-gray-500 bg-gray-900/50' : 'hover:bg-gray-700/30'} ${t.isDuplicate ? 'bg-orange-900/50' : ''}`}>
                                        <td className="p-2">
                                            <input type="checkbox" checked={t.selected} onChange={e => handleTransactionChange(t.id, 'selected', e.target.checked)} />
                                            {t.isDuplicate && <span className="text-xs text-orange-400 font-bold ml-1 block">DUPE?</span>}
                                        </td>
                                        <td className="p-2">{t.date}</td>
                                        <td className="p-2"><input type="text" value={t.vendor} onChange={e => handleTransactionChange(t.id, 'vendor', e.target.value)} className="p-1 border rounded w-full bg-gray-700 border-gray-600" /></td>
                                        <td className="p-2">{formatCurrency(t.amount)}</td>
                                        <td className="p-2">
                                            <select value={t.category} onChange={e => handleTransactionChange(t.id, 'category', e.target.value)} className="p-1 border rounded w-full bg-gray-700 border-gray-600">
                                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select value={t.paymentType} onChange={e => handleTransactionChange(t.id, 'paymentType', e.target.value)} className="p-1 border rounded w-full bg-gray-700 border-gray-600">
                                                <option value="CC">CC</option>
                                                <option value="Check">Check</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                            </select>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSaveClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg" disabled={transactions.filter(t => t.selected).length === 0}>
                        Save Selected ({transactions.filter(t => t.selected).length})
                    </button>
                </div>
            </div>
        </div>
    );
}






