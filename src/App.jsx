// v1.5.5 - Date Filter change.
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
    setLogLevel,
    getDocs
} from 'firebase/firestore';

// --- Helper Components & Icons (as SVGs to keep it in one file) ---

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 L 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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

const CollapsibleCard = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 overflow-hidden transition-all duration-300">
            <h3 
                className="text-lg font-semibold text-gray-200 p-6 cursor-pointer flex justify-between items-center hover:bg-gray-700/20 transition-colors"
                onClick={toggleOpen}
            >
                {title}
                <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
            </h3>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                 <div className="p-6 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- New Login Screen Component ---
const LoginScreen = ({ auth }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [anonymousLoading, setAnonymousLoading] = useState(false);

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

    const handleAnonymousSignIn = async () => {
        setAnonymousLoading(true);
        setError('');
        try {
            await signInAnonymously(auth);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setAnonymousLoading(false);
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

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-gray-800 px-2 text-gray-400">Or</span>
                        </div>
                    </div>

                    <div>
                         <button
                            type="button"
                            onClick={handleAnonymousSignIn}
                            disabled={loading || anonymousLoading}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 transition-colors duration-300 flex justify-center items-center"
                        >
                            {anonymousLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Sign in Anonymously'}
                        </button>
                    </div>

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

    // State for expense view filters, lifted from CrudView
    const [expenseGroupBy, setExpenseGroupBy] = useState('category');
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
    const [expenseVendorFilter, setExpenseVendorFilter] = useState('');


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

        // Load Chart.js for pie charts
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        chartScript.async = true;
        document.body.appendChild(chartScript);

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
                document.body.removeChild(chartScript);
            };
        } catch (error) {
            console.error("Error during Firebase initialization:", error);
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
                case 'last6Months':
                    end = new Date();
                    start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
                case 'lastQuarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    const startMonth = currentQuarter * 3 - 3;
                    start = new Date(now.getFullYear(), startMonth, 1);
                    end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59);
                    break;
                case 'custom':
                    if (!dateFilter.startDate || !dateFilter.endDate) return data;
                    //start = new Date(dateFilter.startDate);
                    //end = new Date(dateFilter.endDate);
                    //start.setHours(0, 0, 0, 0);
                    //end.setHours(23, 59, 59, 999);
    			const [sy, sm, sd] = dateFilter.startDate.split('-').map(Number);
    			const [ey, em, ed] = dateFilter.endDate.split('-').map(Number);

    			start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    			end   = new Date(ey, em - 1, ed, 23, 59, 59, 999);

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
            case 'last6Months':
                end = new Date();
                start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
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
                            <div className="flex items-center ml-2 pl-2 border-l border-gray-700">
                                <span className="text-sm text-gray-300 px-3 truncate max-w-[150px] md:max-w-xs" title={user.isAnonymous ? 'Guest User' : user.email}>
                                    {user.isAnonymous ? 'Guest User' : user.email}
                                </span>
                                <button onClick={handleLogout} className="px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 text-gray-300 hover:bg-red-600/70 hover:text-white">
                                    Logout
                                </button>
                            </div>
                        </nav>
                    </div>
                </header>
            </div>
            <main className="container mx-auto p-4 md:p-8">
                {(!isAuthReady || isLoading) ? <LoadingSpinner /> : (
                    <>
                        <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
                            <DashboardView totals={totals} revenues={filteredRevenues} expenses={filteredExpenses} allRevenues={revenues} allExpenses={expenses} formatCurrency={formatCurrency} vendors={vendors} displayDateRange={displayDateRange} db={db} userId={userId} appId={appId} />
                        </div>
                        <div style={{ display: view === 'revenue' ? 'block' : 'none' }}>
                            <CrudView title="Revenue" data={filteredRevenues} db={db} userId={userId} appId={appId} collectionName="revenues" fields={['source', 'date', 'checkAmount', 'cashAmount', 'reportable']} formatCurrency={formatCurrency} />
                        </div>
                        <div style={{ display: view === 'expenses' ? 'block' : 'none' }}>
                            <CrudView title="Expenses" 
                                data={filteredExpenses} 
                                db={db} 
                                userId={userId} 
                                appId={appId} 
                                collectionName="expenses" 
                                fields={['date', 'vendorId', 'category', 'amount', 'paymentType', 'reportable', 'description']} 
                                formatCurrency={formatCurrency} 
                                vendors={vendors} 
                                groupBy={expenseGroupBy}
                                onGroupByChange={setExpenseGroupBy}
                                categoryFilter={expenseCategoryFilter}
                                onCategoryFilterChange={setExpenseCategoryFilter}
                                vendorFilter={expenseVendorFilter}
                                onVendorFilterChange={setExpenseVendorFilter}
                            />
                        </div>
                        <div style={{ display: view === 'vendors' ? 'block' : 'none' }}>
                            <CrudView title="Vendors" data={vendors} db={db} userId={userId} appId={appId} collectionName="vendors" fields={['name', 'category', 'contactPerson', 'email', 'phoneNumber', 'accountNumber']} formatCurrency={formatCurrency} />
                        </div>
                    </>
                )}
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
        for (let i = 0; i < 9; i++) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            months.push({
                value: `${year}-${month}`,
                label: `${date.toLocaleString('default', { month: 'long' })} ${year}`
            });
            date.setMonth(date.getMonth() - 1);
        }
        return months;
    }, []);

    return (
        <div className="flex flex-col md:flex-row items-center gap-2 w-full">
            <select
                value={reportTypeFilter}
                onChange={(e) => onReportTypeFilterChange(e.target.value)}
                className="w-full md:w-auto bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="all">All Transactions</option>
                <option value="reportableOnly">Reportable Only</option>
                <option value="nonReportableOnly">Non-Reportable Only</option>
            </select>
            <select
                value={dateFilter.type}
                onChange={handleTypeChange}
                className="w-full md:w-auto bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="all">All Time</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="last6Months">Last 6 Months</option>
                <option value="lastQuarter">Last Quarter</option>
                {trailingMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                <option value="custom">Custom Range</option>
            </select>
            {dateFilter.type === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <input
                        type="date"
                        name="startDate"
                        value={customDates.startDate}
                        onChange={handleCustomDateChange}
                        className="w-full sm:w-auto bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        name="endDate"
                        value={customDates.endDate}
                        onChange={handleCustomDateChange}
                        className="w-full sm:w-auto bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={applyCustomFilter} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 text-sm rounded-md">Apply</button>
                </div>
            )}
        </div>
    );
}

function PieChart({ data }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        // Destroy previous chart instance before creating a new one
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        if (window.Chart && chartRef.current && data) {
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new window.Chart(ctx, {
                type: 'pie',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#d1d5db', // text-gray-300
                                boxWidth: 12,
                                padding: 20,
                                generateLabels: function(chart) {
                                    const original = window.Chart.overrides.pie.plugins.legend.labels.generateLabels;
                                    const labels = original.call(this, chart);
                                    const { data } = chart;
                                    if (data.labels.length && data.datasets.length) {
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        labels.forEach(label => {
                                            const value = data.datasets[0].data[label.index];
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                                            label.text = `${data.labels[label.index]}: ${formattedValue} (${percentage}%)`;
                                        });
                                    }
                                    return labels;
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        const value = context.parsed;
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) + ` (${percentage}%)`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Cleanup function to destroy chart instance on component unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]); // Rerun effect when data changes

    return (
        <div className="relative h-72 md:h-80">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

function LineChart({ data }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        if (window.Chart && chartRef.current && data) {
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new window.Chart(ctx, {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#9ca3af', // text-gray-400
                            },
                            grid: {
                                color: 'rgba(107, 114, 128, 0.3)', // gray-500 with opacity
                            }
                        },
                        x: {
                            ticks: {
                                color: '#9ca3af',
                            },
                            grid: {
                                color: 'rgba(107, 114, 128, 0.1)',
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#d1d5db', // text-gray-300
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    interaction: { mode: 'index', intersect: false },
                }
            });
        }

        return () => { if (chartInstance.current) { chartInstance.current.destroy(); } };
    }, [data]);

    return (
        <div className="relative h-80 md:h-96">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

// --- Database Actions Component ---
function DatabaseActions({ allRevenues, allExpenses, vendors, db, userId, appId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [modal, setModal] = useState(null); // 'purge', 'import'
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const dropdownRef = useRef(null);
    const [showBackupPrompt, setShowBackupPrompt] = useState(false);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    useEffect(() => {
        if (statusMessage.text) {
            const timer = setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    useEffect(() => {
        const lastBackupTimestamp = localStorage.getItem('oneKitchenLastBackup');
        const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;

        if (lastBackupTimestamp) {
            const lastBackupDate = new Date(lastBackupTimestamp);
            const now = new Date();
            if (now.getTime() - lastBackupDate.getTime() > threeDaysInMillis) {
                setShowBackupPrompt(true);
            }
        } else {
            // If no backup has ever been made, prompt them.
            setShowBackupPrompt(true);
        }
    }, []);

    const handleExport = () => {
        const exportData = {
            revenues: allRevenues,
            expenses: allExpenses,
            vendors: vendors,
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `one-kitchen-backup-${date}.json`;
        link.click();
        setIsOpen(false);
        localStorage.setItem('oneKitchenLastBackup', new Date().toISOString());
        setShowBackupPrompt(false);
    };

    const handlePurge = async () => {
        if (!db || !userId) return;
        setIsLoading(true);
        setStatusMessage({ type: 'info', text: 'Purging database...' });

        const collectionsToPurge = ['revenues', 'expenses', 'vendors'];
        try {
            for (const collectionName of collectionsToPurge) {
                const collectionRef = collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`);
                const querySnapshot = await getDocs(collectionRef);
                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
            }
            setStatusMessage({ type: 'success', text: 'Database purged successfully!' });
        } catch (error) {
            setStatusMessage({ type: 'error', text: `Error purging: ${error.message}` });
        } finally {
            setIsLoading(false);
            setModal(null);
        }
    };

    const handleImport = async (file) => {
        if (!file || !db || !userId) return;
        setIsLoading(true);
        setStatusMessage({ type: 'info', text: 'Importing database...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.revenues || !data.expenses || !data.vendors) {
                    throw new Error("Invalid backup file format.");
                }

                // Purge existing data first
                const collectionsToPurge = ['revenues', 'expenses', 'vendors'];
                for (const collectionName of collectionsToPurge) {
                    const collectionRef = collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`);
                    const qSnapshot = await getDocs(collectionRef);
                    const pBatch = writeBatch(db);
                    qSnapshot.forEach((doc) => pBatch.delete(doc.ref));
                    await pBatch.commit();
                }

                const { revenues, expenses, vendors: vendorsToImport } = data;
                
                // Import vendors and create an ID map
                const oldIdToNewIdMap = {};
                const vendorsBatch = writeBatch(db);
                const vendorsCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/vendors`);
                vendorsToImport.forEach(vendor => {
                    const oldId = vendor.id;
                    const { id, ...vendorData } = vendor;
                    const newDocRef = doc(vendorsCollectionRef);
                    vendorsBatch.set(newDocRef, vendorData);
                    oldIdToNewIdMap[oldId] = newDocRef.id;
                });
                await vendorsBatch.commit();

                // Import expenses, updating vendorId using the map
                const expensesBatch = writeBatch(db);
                const expensesCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);
                expenses.forEach(expense => {
                    const { id, vendorId, ...expenseData } = expense;
                    const newVendorId = oldIdToNewIdMap[vendorId] || null;
                    const newDocRef = doc(expensesCollectionRef);
                    expensesBatch.set(newDocRef, { ...expenseData, vendorId: newVendorId });
                });
                await expensesBatch.commit();
                
                // Import revenues
                const revenuesBatch = writeBatch(db);
                const revenuesCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/revenues`);
                revenues.forEach(revenue => {
                    const { id, ...revenueData } = revenue;
                    const newDocRef = doc(revenuesCollectionRef);
                    revenuesBatch.set(newDocRef, revenueData);
                });
                await revenuesBatch.commit();

                setStatusMessage({ type: 'success', text: 'Database imported successfully!' });
            } catch (error) {
                setStatusMessage({ type: 'error', text: `Import failed: ${error.message}` });
            } finally {
                setIsLoading(false);
                setModal(null);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            {statusMessage.text && (
                <div className={`fixed top-24 right-8 z-50 p-4 rounded-lg shadow-lg text-white ${
                    statusMessage.type === 'success' ? 'bg-green-600/80' : 
                    statusMessage.type === 'error' ? 'bg-red-600/80' : 'bg-blue-600/80'
                }`}>
                    {statusMessage.text}
                </div>
            )}

            {showBackupPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-gray-700">
                        <h2 className="text-2xl font-bold mb-4 text-white">Backup Recommended</h2>
                        <p className="text-gray-300 mb-8">It's been more than 3 days since your last backup. To protect your data, it's a good idea to export it now.</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setShowBackupPrompt(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Remind Me Later</button>
                            <button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Backup Now</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 bg-gray-600 hover:bg-gray-700 rounded-full text-white transition-colors"
                    aria-label="Database Actions"
                >
                    <SettingsIcon />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
                        <div className="py-1">
                            <button onClick={handleExport} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Export Database</button>
                            <button onClick={() => { setModal('import'); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Import Database</button>
                            <button onClick={() => { setModal('purge'); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20">Purge Database</button>
                        </div>
                    </div>
                )}
            </div>

            {modal === 'purge' && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-gray-700">
                        <h2 className="text-2xl font-bold mb-4 text-white">Purge Database</h2>
                        <p className="text-gray-300 mb-8">Are you sure? This will <span className="font-bold text-red-400">permanently delete all</span> revenues, expenses, and vendors. This action cannot be undone.</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setModal(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                            <button onClick={handlePurge} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500">{isLoading ? "Purging..." : "Confirm Purge"}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {modal === 'import' && <ImportModal onImport={handleImport} onCancel={() => setModal(null)} isLoading={isLoading} />}
        </>
    );
}

function ImportModal({ onImport, onCancel, isLoading }) {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/json') {
            setFile(selectedFile);
        } else {
            setFile(null);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white text-center">Import Database</h2>
                <p className="text-gray-300 mb-6 text-center">This will <span className="font-bold text-red-400">DELETE ALL EXISTING DATA</span> and replace it with data from the backup file. This action cannot be undone.</p>
                <div className="mb-6">
                    <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="import-file">Select Backup File (.json)</label>
                    <input type="file" id="import-file" accept=".json" onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"/>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                    <button onClick={() => onImport(file)} disabled={!file || isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500">{isLoading ? "Importing..." : "Purge and Import"}</button>
                </div>
            </div>
        </div>
    );
}


function DashboardView({ totals, revenues, expenses, allRevenues, allExpenses, formatCurrency, vendors, displayDateRange, db, userId, appId }) {
    const [expandedExpenseGroups, setExpandedExpenseGroups] = useState({});
    const [lineChartFilter, setLineChartFilter] = useState('rev_exp_profit');

    const toggleExpenseGroup = (category) => {
        setExpandedExpenseGroups(prev => ({...prev, [category]: !prev[category]}));
    };
    
    const getVendorName = (vendorId) => {
        if (!vendors || !vendorId) return 'N/A';
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : 'Unknown Vendor';
    };

    const parseExpenseDetails = (expense) => {
        let vendor = getVendorName(expense.vendorId);
        let description = expense.description || '';

        if ((vendor === 'N/A' || vendor === 'Unknown Vendor') && expense.description && expense.description.includes('---')) {
            const parts = expense.description.split('---');
            vendor = parts[0];
            description = parts[1];
        }
        
        return { vendor, description };
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
        
        const groups = expenses.reduce((acc, expense) => {
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


    const expenseChartData = useMemo(() => {
        if (!groupedRecentExpenses || groupedRecentExpenses.sortedCategories.length === 0) return null;
        
        const labels = groupedRecentExpenses.sortedCategories;
        const data = labels.map(cat => groupedRecentExpenses.groups[cat].total);
        
        return {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#818cf8', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#c084fc', '#f97316', '#eab308', '#22c55e', '#0ea5e9'],
                borderColor: '#1f2937', // bg-gray-800
                borderWidth: 2,
            }]
        };
    }, [groupedRecentExpenses]);

    const revenueChartData = useMemo(() => {
        if (!revenues || revenues.length === 0) return null;

        const sources = revenues.reduce((acc, rev) => {
            const source = rev.source || 'Unspecified';
            const totalAmount = (parseFloat(rev.checkAmount) || 0) + (parseFloat(rev.cashAmount) || 0);
            if (!acc[source]) {
                acc[source] = 0;
            }
            acc[source] += totalAmount;
            return acc;
        }, {});

        const labels = Object.keys(sources);
        const data = Object.values(sources);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#34d399', '#60a5fa', '#f472b6', '#a78bfa'],
                borderColor: '#1f2937',
                borderWidth: 2,
            }]
        };
    }, [revenues]);

    const lineChartData = useMemo(() => {
        // Generate the last 12 rolling months from today
        const last12Months = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            last12Months.push(`${year}-${month}`);
        }
        
        const labels = last12Months.map(monthStr => {
            const [year, m] = monthStr.split('-');
            return new Date(year, m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        });

        const chartColors = ['#818cf8', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];


        switch(lineChartFilter) {
            case 'revenue_by_source': {
                if (allRevenues.length === 0) return null;
                const revenueSources = [...new Set(allRevenues.map(r => r.source || 'Unspecified'))];

                const monthlyRevenueData = allRevenues.reduce((acc, r) => {
                    const month = (r.date || '').substring(0, 7);
                    if (!month) return acc;
                    const source = r.source || 'Unspecified';
                    if (!acc[month]) acc[month] = {};
                    acc[month][source] = (acc[month][source] || 0) + (parseFloat(r.checkAmount) || 0) + (parseFloat(r.cashAmount) || 0);
                    return acc;
                }, {});

                const datasets = revenueSources.map((source, index) => {
                    const data = last12Months.map(m => monthlyRevenueData[m]?.[source] || 0);
                    const color = chartColors[index % chartColors.length];
                    return {
                        label: source,
                        data,
                        borderColor: color,
                        backgroundColor: `${color}1A`, // Add alpha for fill
                        fill: true,
                        tension: 0.3
                    };
                });
                return { labels, datasets };
            }
            
            case 'expenses_wages':
            case 'expenses_cogs_supplies':
            case 'expenses_utilities': {
                let categoryExpenses;
                let label;
                let color;

                switch(lineChartFilter) {
                    case 'expenses_wages':
                        categoryExpenses = allExpenses.filter(e => e.category === 'Wages');
                        label = 'Wages';
                        color = '#f472b6'; // Pink
                        break;
                    case 'expenses_cogs_supplies':
                        categoryExpenses = allExpenses.filter(e => e.category === 'COGS' || e.category === 'Supplies');
                        label = 'COGS & Supplies';
                        color = '#f97316'; // Orange
                        break;
                    case 'expenses_utilities':
                        categoryExpenses = allExpenses.filter(e => e.category === 'Utilities');
                        label = 'Utilities';
                        color = '#eab308'; // Yellow
                        break;
                }
                
                if (!categoryExpenses || categoryExpenses.length === 0) return null;

                const monthlyExpenseData = categoryExpenses.reduce((acc, e) => {
                    const month = (e.date || '').substring(0, 7);
                    if (!month) return acc;
                    acc[month] = (acc[month] || 0) + parseFloat(e.amount || 0);
                    return acc;
                }, {});

                const data = last12Months.map(m => monthlyExpenseData[m] || 0);
                return {
                    labels,
                    datasets: [{
                        label,
                        data,
                        borderColor: color,
                        backgroundColor: `${color}1A`, // color with alpha
                        fill: true,
                        tension: 0.3
                    }]
                };
            }

            case 'rev_exp_profit':
            default: {
                const allTransactions = [
                    ...allRevenues.map(r => ({ type: 'revenue', date: r.date, amount: (parseFloat(r.checkAmount) || 0) + (parseFloat(r.cashAmount) || 0) })),
                    ...allExpenses.map(e => ({ type: 'expense', date: e.date, amount: parseFloat(e.amount || 0) }))
                ];

                if (allTransactions.length === 0) return null;

                const monthlyData = allTransactions.reduce((acc, t) => {
                    if (!t.date) return acc;
                    const month = t.date.substring(0, 7); // YYYY-MM format
                    if (!acc[month]) {
                        acc[month] = { revenue: 0, expense: 0 };
                    }
                    if (t.type === 'revenue') {
                        acc[month].revenue += t.amount;
                    } else {
                        acc[month].expense += t.amount;
                    }
                    return acc;
                }, {});

                const revenueData = last12Months.map(m => monthlyData[m]?.revenue || 0);
                const expenseData = last12Months.map(m => monthlyData[m]?.expense || 0);
                const netData = last12Months.map(m => (monthlyData[m]?.revenue || 0) - (monthlyData[m]?.expense || 0));

                return {
                    labels,
                    datasets: [
                        { label: 'Revenue', data: revenueData, borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', fill: true, tension: 0.3 },
                        { label: 'Expenses', data: expenseData, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)', fill: true, tension: 0.3 },
                        { label: 'Net Profit', data: netData, borderColor: '#818cf8', backgroundColor: 'rgba(129, 140, 248, 0.1)', fill: true, tension: 0.3 }
                    ]
                };
            }
        }
    }, [allRevenues, allExpenses, lineChartFilter]);


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
                const { vendor, description } = parseExpenseDetails(e);
                const line = `${e.date} | ${vendor} | ${description || ''}`;
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
            .map(e => {
                const { vendor, description } = parseExpenseDetails(e);
                return {
                    Date: e.date,
                    Vendor: vendor,
                    Category: e.category,
                    'Pay Type': e.paymentType,
                    Desc: description,
                    Amount: e.amount || 0
                };
            });
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

    const ChartFilterButton = ({ value, label }) => {
        const isActive = lineChartFilter === value;
        return (
            <button
                onClick={() => setLineChartFilter(value)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors duration-200 ${
                    isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-end items-center gap-4">
                 <DatabaseActions allRevenues={allRevenues} allExpenses={allExpenses} vendors={vendors} db={db} userId={userId} appId={appId} />
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

            <CollapsibleCard title="Profit & Loss Trend (Last 12 Months)">
                <div className="flex flex-wrap gap-2 mb-4">
                    <ChartFilterButton value="rev_exp_profit" label="Rev/Exp/Profit" />
                    <ChartFilterButton value="revenue_by_source" label="Revenue by Source" />
                    <ChartFilterButton value="expenses_wages" label="Expenses - Wages" />
                    <ChartFilterButton value="expenses_cogs_supplies" label="Expenses - COGS & Supplies" />
                    <ChartFilterButton value="expenses_utilities" label="Expenses - Utilities" />
                </div>
                {lineChartData ? (
                    <LineChart data={lineChartData} />
                ) : (
                    <div className="flex items-center justify-center h-80 text-gray-500">
                        No data available for this view.
                    </div>
                )}
            </CollapsibleCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Revenue */}
                <div className="space-y-6">
                    <CollapsibleCard title="Revenue Sources Breakdown">
                         {revenueChartData ? (
                            <PieChart data={revenueChartData} />
                        ) : (
                            <div className="flex items-center justify-center h-72 text-gray-500">No revenue data for this period.</div>
                        )}
                    </CollapsibleCard>
                    <Card title="Revenue Details">
                        <ul className="space-y-3">
                            {revenues.length > 0 ? revenues.map(r => {
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
                </div>

                {/* Right Column - Expenses */}
                <div className="space-y-6">
                    <CollapsibleCard title="Expense Breakdown">
                        {expenseChartData ? (
                            <PieChart data={expenseChartData} />
                        ) : (
                            <div className="flex items-center justify-center h-72 text-gray-500">No expense data for this period.</div>
                        )}
                    </CollapsibleCard>
                    <Card title="Expense Details">
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
                                                    {category} ({group.transactions.length})
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
        </div>
    );
}

const GroupingControl = ({ groupBy, onGroupByChange }) => {
    const options = ['category', 'date', 'vendor', 'amount'];
    return (
        <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-700/50 rounded-full p-1">
            <span className="text-sm font-semibold text-gray-400 pl-3 pr-1">Group By:</span>
            {options.map(opt => (
                <button
                    key={opt}
                    onClick={() => onGroupByChange(opt)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-300 capitalize ${
                        groupBy === opt ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
};

function CrudView({ title, data, db, userId, appId, collectionName, fields, formatCurrency, vendors,
    groupBy, onGroupByChange,
    categoryFilter, onCategoryFilterChange,
    vendorFilter, onVendorFilterChange
}) {
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
    const [wageFieldStatus, setWageFieldStatus] = useState({});
    const [showWageWarning, setShowWageWarning] = useState(false);

    const getVendorName = (vendorId) => {
        if (!vendors || !vendorId) return 'N/A';
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : 'Unknown Vendor';
    };

    const handleGroupByChange = (newGroupBy) => {
        if (onGroupByChange) {
            onGroupByChange(newGroupBy);
        }
    };

    const getVendorNameFromItem = (item) => {
        const vendorName = getVendorName(item.vendorId);
        if (vendorName === 'N/A' || vendorName === 'Unknown Vendor') {
            if (item.description && item.description.includes('---')) {
                return item.description.split('---')[0];
            }
            return 'Unassigned';
        }
        return vendorName;
    };
    
    const expenseCategories = useMemo(() => {
        if (collectionName !== 'expenses') return [];
        // Use the original `data` prop to populate all possible categories
        const categories = new Set(data.map(item => item.category).filter(Boolean));
        return ['all', ...Array.from(categories).sort()];
    }, [data, collectionName]);

    const locallyFilteredData = useMemo(() => {
        if (collectionName !== 'expenses') return data;

        return data.filter(item => {
            const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
            const vendorName = getVendorNameFromItem(item).toLowerCase();
            const vendorMatch = vendorFilter === '' || vendorName.includes(vendorFilter.toLowerCase());
            return categoryMatch && vendorMatch;
        });
    }, [data, collectionName, categoryFilter, vendorFilter, vendors]);

    const processedData = useMemo(() => {
        if (collectionName !== 'expenses' || !locallyFilteredData) {
            return null;
        }

        switch (groupBy) {
            case 'date': {
                const groups = locallyFilteredData.reduce((acc, expense) => {
                    const month = expense.date ? expense.date.substring(0, 7) : 'Undated';
                    if (!acc[month]) acc[month] = { transactions: [], total: 0 };
                    acc[month].transactions.push(expense);
                    acc[month].total += parseFloat(expense.amount || 0);
                    return acc;
                }, {});
                const sortedKeys = Object.keys(groups).sort().reverse();
                return { groups, sortedKeys, isGrouped: true };
            }
            case 'vendor': {
                 const groups = locallyFilteredData.reduce((acc, expense) => {
                    const vendorName = getVendorNameFromItem(expense);
                    if (!acc[vendorName]) acc[vendorName] = { transactions: [], total: 0 };
                    acc[vendorName].transactions.push(expense);
                    acc[vendorName].total += parseFloat(expense.amount || 0);
                    return acc;
                }, {});
                const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);
                return { groups, sortedKeys, isGrouped: true };
            }
            case 'amount': {
                const sortedTransactions = [...locallyFilteredData].sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
                return { transactions: sortedTransactions, isGrouped: false };
            }
            case 'category':
            default: {
                const groups = locallyFilteredData.reduce((acc, expense) => {
                    const category = expense.category || 'Uncategorized';
                    if (!acc[category]) acc[category] = { transactions: [], total: 0 };
                    acc[category].transactions.push(expense);
                    acc[category].total += parseFloat(expense.amount || 0);
                    return acc;
                }, {});
                const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);
                return { groups, sortedKeys, isGrouped: true };
            }
        }
    }, [locallyFilteredData, collectionName, groupBy, vendors]);
    
    useEffect(() => {
        // This effect preserves the expanded/collapsed state of groups across data changes.
        if (collectionName === 'expenses' && processedData && processedData.isGrouped) {
            setExpandedGroups(prev => {
                const newExpandedState = {};
                for (const key of processedData.sortedKeys) {
                    // If a group existed before in the previous state, keep its state (true/false).
                    // If it's a new group, it will be undefined in `prev`, so default to collapsed (false).
                    newExpandedState[key] = prev[key] || false;
                }
                return newExpandedState;
            });
        }
    }, [processedData, collectionName]);

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

     const handleBatchSave = async (transactions) => {
        if (!db || !userId || transactions.length === 0) return;

        const batch = writeBatch(db);
        const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

        transactions.forEach(t => {
            const docRef = doc(expensesCollection);
            const matchedVendor = vendors.find(v => v.name.toLowerCase() === t.vendor.toLowerCase());

            const dataToSave = {
                date: t.date || '',
                vendorId: matchedVendor ? matchedVendor.id : null,
                category: t.category || 'General Expense',
                amount: parseFloat(t.amount || 0),
                paymentType: t.paymentType || 'CC',
                reportable: t.reportable !== false,
                description: matchedVendor ? t.description : `${t.vendor}---${t.description}`,
            };

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
                // Anchor the pay periods to a known, fixed date.
                // October 5, 2025 is the end of a known pay period.
                const anchorEndDate = new Date('2025-10-05T12:00:00');
                const today = new Date();

                // Find the end date of the pay period that contains today's date or is the next one.
                let firstEndDateInList = new Date(anchorEndDate.getTime());
                while (firstEndDateInList < today) {
                    firstEndDateInList.setDate(firstEndDateInList.getDate() + 14);
                }

                // Generate 13 pay periods backwards from that date.
                for (let i = 0; i < 13; i++) { 
                    const endDate = new Date(firstEndDateInList);
                    const startDate = new Date(firstEndDateInList);
                    startDate.setDate(startDate.getDate() - 13);

                    const formatDate = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;

                    const label = `${formatDate(startDate)}-${formatDate(endDate)}`;
                    const value = endDate.toISOString().split('T')[0];

                    periods.push({ label, value });
                    firstEndDateInList.setDate(firstEndDateInList.getDate() - 14);
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

            let initialVendorName = '';
            let initialDescription = itemData.description || '';

            if (!itemData.vendorId && itemData.description && itemData.description.includes('---')) {
                const parts = itemData.description.split('---');
                initialVendorName = parts[0];
                initialDescription = parts[1];
            } 
            else if (itemData.vendorId && vendors && vendors.length > 0) {
                const vendor = vendors.find(v => v.id === itemData.vendorId);
                initialVendorName = vendor ? vendor.name : '';
            }

            setFormData({ ...itemData, description: initialDescription });
            setVendorNameInput(initialVendorName);
            setShowForm(true);
        } else {
             setFormData(getInitialFormData(addMode));
             setVendorNameInput('');
             if (addMode === 'multiple') {
                setExpenseRows(Array(10).fill().map(() => getInitialFormData('multiple')));
             }
        }
    }, [editingItem, fields, collectionName, showForm, vendors]); 
    
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

        if (name === 'vendorName') { 
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
        } else { 
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
        if (e.shiftKey) { 
            if (index > 0) {
                nextField = field;
                nextIndex = index - 1;
            } else { 
                if (currentFieldIndex > 0) {
                    nextField = fieldOrder[currentFieldIndex - 1];
                    nextIndex = expenseRows.length - 1;
                } else {
                    return; 
                }
            }
        } else { 
            if (index < expenseRows.length - 1) {
                nextField = field;
                nextIndex = index + 1;
            } else { 
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
            
            const newFieldStatus = {};
            let hasMissingFields = false;
            if (!payrollAmount) { newFieldStatus.payrollAmount = 'warn'; hasMissingFields = true; }
            if (!payrollTax) { newFieldStatus.payrollTax = 'warn'; hasMissingFields = true; }
            if (!cash) { newFieldStatus.cash = 'warn'; hasMissingFields = true; }
            setWageFieldStatus(newFieldStatus);

            if(hasMissingFields && !showWageWarning) {
                setShowWageWarning(true);
                return; 
            }

            const payrollVendor = vendors.find(v => v.name === 'Sure Payroll');
            const payrollVendorId = payrollVendor ? payrollVendor.id : null;

            if (!payPeriod) {
                console.error("Pay period is required.");
                return;
            }
            
            const selectedPeriod = payPeriods.find(p => p.value === payPeriod);
            const periodLabel = selectedPeriod ? selectedPeriod.label : '';

            const batch = writeBatch(db);
            const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

            const docRef1 = doc(expensesCollection);
            batch.set(docRef1, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(payrollAmount || 0), paymentType: 'Bank Transfer', reportable: true, description: `Pay Period: ${periodLabel}` });
            
            const docRef2 = doc(expensesCollection);
            batch.set(docRef2, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(payrollTax || 0), paymentType: 'Bank Transfer', reportable: true, description: `Payroll Tax: ${periodLabel}` });
            
            const docRef3 = doc(expensesCollection);
            batch.set(docRef3, { date: payPeriod, vendorId: payrollVendorId, category: 'Wages', amount: parseFloat(cash || 0), paymentType: 'Cash', reportable: false, description: `Cash Payroll: ${periodLabel}` });
            
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
            }

            const validRowsToSave = rowsWithAmount.filter(row => row.vendorName && row.category && row.paymentType);

            if (validRowsToSave.length === 0) {
                if(invalidRows.length === 0) console.log("No expense rows to save.");
                if (invalidRows.length > 0) return;
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
                dataToSave.description = `${vendorNameInput}---${dataToSave.description || ''}`;
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
        setExpenseRows([]); 
        setRowErrors([]);
        setShowWageWarning(false);
        setWageFieldStatus({});
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
                if(addMode === 'multiple') return false; 
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
                 
                 return (
                    <>
                        <input
                            list="vendors-list-multi"
                            name="vendorName"
                            id={fieldId}
                            className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${hasError ? 'border-red-500' : 'border-gray-600'}`}
                            value={data.vendorName || ''}
                            onChange={onChange}
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
                    {showWageWarning && (
                        <div className="bg-orange-800/50 text-orange-300 border border-orange-700 p-3 rounded-lg text-center text-sm">
                            <p className="font-bold">Missing Fields</p>
                            <p>One or more amount fields are empty. You can still save, and a value of $0.00 will be recorded for any empty fields.</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payPeriod">Pay Period</label>
                        <select id="payPeriod" name="payPeriod" value={formData.payPeriod || ''} onChange={handleInputChange} className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                            <option value="">Select a pay period</option>
                            {payPeriods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payrollAmount">Payroll Amount</label>
                        <input type="number" step="0.01" id="payrollAmount" name="payrollAmount" value={formData.payrollAmount || ''} onChange={handleInputChange} className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${wageFieldStatus.payrollAmount === 'warn' ? 'border-red-500 ring-red-500' : 'border-gray-600'}`} />
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payrollTax">Payroll Tax</label>
                        <input type="number" step="0.01" id="payrollTax" name="payrollTax" value={formData.payrollTax || ''} onChange={handleInputChange} className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${wageFieldStatus.payrollTax === 'warn' ? 'border-red-500 ring-red-500' : 'border-gray-600'}`} />
                    </div>
                     <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="cash">Cash</label>
                        <input type="number" step="0.01" id="cash" name="cash" value={formData.cash || ''} onChange={handleInputChange} className={`shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${wageFieldStatus.cash === 'warn' ? 'border-red-500 ring-red-500' : 'border-gray-600'}`} />
                    </div>
                    <div className="flex items-center justify-end gap-4 pt-4">
                        <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                            {showWageWarning ? 'Save Anyway' : 'Save'}
                        </button>
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
                                    className="h-5 w-5 bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500 rounded"
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
                <div className="flex justify-between items-center flex-wrap mb-6 gap-4">
                     {collectionName === 'expenses' && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                            <GroupingControl groupBy={groupBy} onGroupByChange={handleGroupByChange} />
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-400">Filter By:</span>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => onCategoryFilterChange(e.target.value)}
                                    className="w-48 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Filter by vendor name..."
                                    value={vendorFilter}
                                    onChange={(e) => onVendorFilterChange(e.target.value)}
                                    className="w-48 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                     )}
                    <div className="flex justify-end flex-wrap gap-4 flex-grow">
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
                                (collectionName === 'expenses' && processedData) ? (
                                    processedData.isGrouped ? (
                                        processedData.sortedKeys.map(key => {
                                            const group = processedData.groups[key];
                                            const isExpanded = expandedGroups[key];

                                            const formatMonthYear = (monthStr) => {
                                                if (monthStr === 'Undated') return 'Undated';
                                                const [year, month] = monthStr.split('-');
                                                const date = new Date(year, parseInt(month, 10) - 1, 2); 
                                                return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                                            };
                                            const displayKey = groupBy === 'date' ? formatMonthYear(key) : key;

                                            return (
                                                <React.Fragment key={key}>
                                                    <tr className="bg-gray-700/30 font-semibold cursor-pointer hover:bg-gray-700/50" onClick={() => toggleGroup(key)}>
                                                        <td className="p-4" colSpan={fields.length}>
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <span className="mr-3 text-lg text-indigo-400">{isExpanded ? '▼' : '►'}</span>
                                                                    {displayKey} ({group.transactions.length})
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
                                        processedData.transactions.map(item => renderItemRow(item, false))
                                    )
                                ) : (
                                    data.map(item => renderItemRow(item, false))
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
            setTransactions([]); 
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
            'j&q chinatown express inc',
            'ono'
        ],
    };

    const autoCategorize = (vendor, defaultCategory = 'General Expense') => {
        const vendorLower = vendor.toLowerCase();
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

            if (amount >= 0) return; 
            if (paymentKeywords.some(keyword => vendor.toLowerCase().includes(keyword))) {
                return;
            }

            const dateStr = values[0];
            const dateParts = dateStr.split('/');
            if (dateParts.length !== 3) return;
            
            let [month, day, year] = dateParts;

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
            if (values.length < 6 || !values[5] || values[4].toLowerCase() === 'payment/credit') return;

            const debit = parseFloat(values[5]);
            if (debit > 0) {
                let transactionDate = values[0];
                if (transactionDate.includes('/')) {
                    const parts = transactionDate.split('/');
                    const month = parts[0].padStart(2, '0');
                    const day = parts[1].padStart(2, '0');
                    let year = parts[2];
                    if (year.length === 2) {
                        year = `20${year}`;
                    }
                    transactionDate = `${year}-${month}-${day}`;
                }

                 parsed.push({
                    date: transactionDate, 
                    vendor: values[3].replace(/&amp;/g, '&'),
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




