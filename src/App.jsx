// v2.0.0 - Implemented Email/Password Authentication
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
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
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);


// --- Login Component ---
function Login({ onLogin, error }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                <h1 className="text-3xl font-bold text-center mb-2 text-indigo-400">One Kitchen P&L</h1>
                <h2 className="text-xl text-center mb-6">Sign In</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-600"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-600"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex flex-col gap-4">
                         <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out">
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// --- Main Application ---
function App() {
    const [app, setApp] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState('');

    const [revenues, setRevenues] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'one-kitchen-tracker';

    // --- Initialize Firebase and Authentication ---
    useEffect(() => {
        try {
            const firebaseConfig = JSON.parse(window.__firebase_config);
            const firebaseApp = initializeApp(firebaseConfig);
            const firebaseAuth = getAuth(firebaseApp);
            const firestoreDb = getFirestore(firebaseApp);
            setLogLevel('debug');

            setApp(firebaseApp);
            setAuth(firebaseAuth);
            setDb(firestoreDb);

            const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            });

            // Cleanup subscription on unmount
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization error:", error);
            setLoading(false);
        }
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (!db || !user) {
            // Clear data if user logs out
            setRevenues([]);
            setExpenses([]);
            setVendors([]);
            return;
        }

        const userId = user.uid;
        const collectionsMeta = {
            revenues: { setter: setRevenues, ref: collection(db, `/artifacts/${appId}/users/${userId}/revenues`) },
            expenses: { setter: setExpenses, ref: collection(db, `/artifacts/${appId}/users/${userId}/expenses`) },
            vendors: { setter: setVendors, ref: collection(db, `/artifacts/${appId}/users/${userId}/vendors`) }
        };

        const unsubscribers = Object.entries(collectionsMeta).map(([name, meta]) => {
            const q = query(meta.ref);
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (name === 'vendors' && snapshot.empty) {
                    prepopulateVendors(); 
                } else {
                    meta.setter(data);
                }
            }, (error) => console.error(`Error fetching ${name}:`, error));
        });

        const prepopulateVendors = async () => {
             if (!db || !user) return;
             const batch = writeBatch(db);
             const vendorsCollectionRef = collection(db, `/artifacts/${appId}/users/${user.uid}/vendors`);
             const defaultVendors = [
                { name: "Sure Payroll", category: "Wages" },
                { name: "Restaurant Depot", category: "COGS" },
                { name: "Smart and Final", category: "COGS" },
             ];
             defaultVendors.forEach(vendor => {
                const docRef = doc(vendorsCollectionRef);
                batch.set(docRef, vendor);
             });
             try {
                await batch.commit();
             } catch (error) {
                console.error("Error prepopulating vendors:", error);
             }
        };

        return () => unsubscribers.forEach(unsub => unsub());
    }, [db, user, appId]);


    const handleLogin = async (email, password) => {
        if (!auth) return;
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError(error.message.replace('Firebase: ', ''));
        }
    };

    const handleLogout = () => {
        if (!auth) return;
        signOut(auth).catch(error => console.error("Logout error:", error));
    };

    const formatCurrency = (value) => {
        const number = Number(value) || 0;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
    };

    const fullApp = (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-700">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-indigo-400">One Kitchen P&L</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                             {user && <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>}
                            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-700 transition duration-300" title="Logout">
                                <LogoutIcon />
                            </button>
                        </div>
                    </div>
                </nav>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6 border-b border-gray-700">
                    <div className="flex space-x-8">
                        {['dashboard', 'revenues', 'expenses', 'vendors'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`capitalize py-2 px-1 text-sm font-medium transition-colors duration-300 ${activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-400' : 'border-b-2 border-transparent text-gray-400 hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="transition-opacity duration-500">
                    {activeTab === 'dashboard' && <Dashboard expenses={expenses} revenues={revenues} vendors={vendors} formatCurrency={formatCurrency} />}
                    {activeTab === 'revenues' && <CrudView title="Revenues" data={revenues} db={db} userId={user.uid} appId={appId} collectionName="revenues" fields={['date', 'description', 'amount']} formatCurrency={formatCurrency} vendors={vendors} />}
                    {activeTab === 'expenses' && <CrudView title="Expenses" data={expenses} db={db} userId={user.uid} appId={appId} collectionName="expenses" fields={['date', 'vendorId', 'category', 'amount', 'paymentType', 'reportable', 'description']} formatCurrency={formatCurrency} vendors={vendors} />}
                    {activeTab === 'vendors' && <CrudView title="Vendors" data={vendors} db={db} userId={user.uid} appId={appId} collectionName="vendors" fields={['name', 'category', 'contactPerson', 'email', 'phoneNumber', 'accountNumber']} formatCurrency={formatCurrency} vendors={vendors} />}
                </div>
            </main>
        </div>
    );
    
    if (loading) {
        return <LoadingSpinner />;
    }
    
    if (!user) {
        return <Login onLogin={handleLogin} error={authError} />;
    }

    return fullApp;
}

// ... the rest of your components (Dashboard, CrudView, StatementUploadModal, etc.) remain unchanged ...
// Make sure to paste them here from your original file.

function Dashboard({ expenses, revenues, vendors, formatCurrency }) {
    const { totalRevenue, totalExpenses, netIncome } = useMemo(() => {
        const totalRevenue = revenues.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const netIncome = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netIncome };
    }, [revenues, expenses]);

    const expenseByCategory = useMemo(() => {
        const categoryMap = expenses.reduce((acc, e) => {
            const category = e.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (Number(e.amount) || 0);
            return acc;
        }, {});
        return Object.entries(categoryMap).sort(([, a], [, b]) => b - a);
    }, [expenses]);
    
     const expensesByVendor = useMemo(() => {
        const vendorMap = expenses.reduce((acc, expense) => {
            const vendor = vendors.find(v => v.id === expense.vendorId);
            const vendorName = vendor ? vendor.name : (expense.description && expense.description.includes('---') ? expense.description.split('---')[0] : 'Unknown Vendor');
            if (vendorName) {
                acc[vendorName] = (acc[vendorName] || 0) + (Number(expense.amount) || 0);
            }
            return acc;
        }, {});
        return Object.entries(vendorMap).sort(([, a], [, b]) => b - a);
    }, [expenses, vendors]);


    return (
        <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400">Total Revenue</h3>
                    <p className="text-3xl font-semibold text-green-400">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400">Total Expenses</h3>
                    <p className="text-3xl font-semibold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400">Net Income</h3>
                    <p className={`text-3xl font-semibold ${netIncome >= 0 ? 'text-blue-400' : 'text-yellow-400'}`}>{formatCurrency(netIncome)}</p>
                </div>
            </div>

            {/* Charts/Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {expenseByCategory.map(([category, amount]) => (
                            <div key={category}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{category}</span>
                                    <span>{formatCurrency(amount)}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(amount / totalExpenses) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Expenses by Vendor</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {expensesByVendor.map(([vendorName, amount]) => (
                            <div key={vendorName} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-700/50">
                                <span className="truncate pr-4">{vendorName}</span>
                                <span className="font-medium whitespace-nowrap">{formatCurrency(amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
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
    const [sortConfig, setSortConfig] = useState({ key: fields[0], direction: 'ascending' });
    
    const [expandedGroups, setExpandedGroups] = useState({});
    const [showStatementUpload, setShowStatementUpload] = useState(false);

    // Helper functions for auto-categorization, moved up from the modal
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
        if (vendorLower.includes('costco gas')) return 'Auto & Travel';
        for (const category in categoryKeywords) {
            if (categoryKeywords[category].some(keyword => vendorLower.includes(keyword))) {
                return category;
            }
        }
        return defaultCategory;
    };

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                
                if (sortConfig.key === 'vendorId') {
                    aValue = vendors.find(v => v.id === a.vendorId)?.name || '';
                    bValue = vendors.find(v => v.id === b.vendorId)?.name || '';
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig, vendors]);

    const groupedData = useMemo(() => {
        if (collectionName !== 'expenses') return { groups: null, sortedCategories: null };

        const groups = sortedData.reduce((acc, item) => {
            const date = new Date(item.date + 'T00:00:00'); // Ensure date is parsed as local time
            const groupKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
            if (!acc[groupKey]) {
                acc[groupKey] = { items: [], total: 0 };
            }
            acc[groupKey].items.push(item);
            acc[groupKey].total += Number(item.amount) || 0;
            return acc;
        }, {});

        const sortedCategories = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
        return { groups, sortedCategories };
    }, [sortedData, collectionName]);

     const handleBatchSave = async (transactions) => {
        if (!db || !userId || transactions.length === 0) return;

        // 1. Find all unique new vendors from the transactions
        const newVendorNames = [...new Set(
            transactions
                .map(t => t.vendor.trim())
                .filter(vendorName => 
                    vendorName && !vendors.some(v => v.name.toLowerCase() === vendorName.toLowerCase())
                )
        )];
        
        const newVendorData = {}; // Temp store for newly created vendor info { name_lower: { id, name, category } }

        // 2. Batch-create new vendors if any are found
        if (newVendorNames.length > 0) {
            const vendorBatch = writeBatch(db);
            const vendorsCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/vendors`);
            for (const name of newVendorNames) {
                const newDocRef = doc(vendorsCollectionRef);
                const category = autoCategorize(name);
                vendorBatch.set(newDocRef, {
                    name: name,
                    category: category,
                    contactPerson: '', email: '', phoneNumber: '', accountNumber: ''
                });
                newVendorData[name.toLowerCase()] = { id: newDocRef.id, name: name, category: category };
            }
            try {
                await vendorBatch.commit();
            } catch (error) {
                console.error("Error creating new vendors:", error);
                return; 
            }
        }
        
        // 3. Batch-create expenses, linking to existing or new vendors
        const expenseBatch = writeBatch(db);
        const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

        transactions.forEach(t => {
            const docRef = doc(expensesCollection);
            const vendorNameTrimmedLower = t.vendor.trim().toLowerCase();
            
            let matchedVendor = vendors.find(v => v.name.toLowerCase() === vendorNameTrimmedLower);
            if (!matchedVendor) {
                 matchedVendor = newVendorData[vendorNameTrimmedLower];
            }

            const dataToSave = {
                date: t.date || '',
                vendorId: matchedVendor ? matchedVendor.id : null,
                category: t.category || 'General Expense',
                amount: parseFloat(t.amount || 0),
                paymentType: t.paymentType || 'CC',
                reportable: t.reportable !== false,
                description: t.description, // No longer contains the vendor name
            };
            
            // Fallback for safety, though it shouldn't be needed
            if (!dataToSave.vendorId) {
                console.warn(`Could not find or create vendor for: ${t.vendor}. Storing in description.`);
                dataToSave.description = t.description ? `${t.vendor}---${t.description}` : t.vendor;
            }

            expenseBatch.set(docRef, dataToSave);
        });

        try {
            await expenseBatch.commit();
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
        const generatePayPeriods = () => {
            const periods = [];
            const today = new Date();
            for (let i = 0; i < 6; i++) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const month = date.toLocaleString('default', { month: 'long' });
                const year = date.getFullYear();
                periods.push(`${month} ${year}`);
            }
            return periods;
        };

        if (showForm && collectionName === 'expenses' && addMode === 'wages') {
            setPayPeriods(generatePayPeriods());
        }
    }, [collectionName, showForm, addMode]);

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
        const newFormData = { ...formData };

        if (type === 'checkbox') {
            newFormData[name] = checked;
        } else {
            newFormData[name] = value;
            if (name === 'vendorId') {
                 const vendor = vendors.find(v => v.id === value);
                 if (vendor && vendor.category) {
                     newFormData.category = vendor.category;
                 }
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
        if (expenseRows.length > 1) {
            const newRows = [...expenseRows];
            newRows.splice(index, 1);
            setExpenseRows(newRows);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;

        if (collectionName === 'expenses' && addMode === 'wages' && !editingItem) {
            const { payPeriod, payrollAmount, payrollTax, cash } = formData;
            const payrollVendor = vendors.find(v => v.name === 'Sure Payroll');
            if (!payrollVendor) {
                console.error("Sure Payroll vendor not found. Please add it on the Vendors page.");
                return;
            }

            const batch = writeBatch(db);
            const expensesCollection = collection(db, `/artifacts/${appId}/users/${userId}/expenses`);

            const wagesExpense = {
                date: new Date().toISOString().split('T')[0],
                vendorId: payrollVendor.id,
                category: 'Wages',
                amount: parseFloat(payrollAmount || 0),
                paymentType: 'Bank Transfer',
                reportable: true,
                description: `Payroll for ${payPeriod}`
            };
            batch.set(doc(expensesCollection), wagesExpense);

            const taxExpense = {
                date: new Date().toISOString().split('T')[0],
                vendorId: payrollVendor.id,
                category: 'Taxes',
                amount: parseFloat(payrollTax || 0),
                paymentType: 'Bank Transfer',
                reportable: true,
                description: `Payroll Tax for ${payPeriod}`
            };
             batch.set(doc(expensesCollection), taxExpense);

             if (parseFloat(cash || 0) > 0) {
                 const cashExpense = {
                    date: new Date().toISOString().split('T')[0],
                    vendorId: null, // No specific vendor for cash withdrawal
                    category: 'Wages',
                    amount: parseFloat(cash || 0),
                    paymentType: 'Cash',
                    reportable: false,
                    description: `Cash wages for ${payPeriod}`
                 };
                  batch.set(doc(expensesCollection), cashExpense);
             }

            try {
                await batch.commit();
                closeForm();
            } catch(error) {
                console.error("Error saving payroll expenses:", error);
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
        
        const collectionRef = collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`);
        
        try {
            if (editingItem) {
                const docRef = doc(db, `/artifacts/${appId}/users/${userId}/${collectionName}`, editingItem.id);
                await updateDoc(docRef, dataToSave);
            } else {
                await addDoc(collectionRef, dataToSave);
            }
            closeForm();
        } catch (error) {
            console.error("Error saving document:", error);
        }
    };
    
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = async () => {
        if (!db || !userId || !itemToDelete) return;
        try {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/${collectionName}`, itemToDelete.id);
            await deleteDoc(docRef);
            setItemToDelete(null); // Close confirmation modal
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };
    
    const openForm = (item = null) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setAddMode('single');
        setVendorNameInput('');
        setRowErrors([]);
    };

    const renderField = (field, data, onChange, index = null, onKeyDownCallback = null, hasError = false) => {
        const fieldId = index !== null ? `${field}-${index}` : field;
        const commonProps = {
            id: fieldId,
            name: field,
            onChange: (e) => onChange(index, e),
            className: `shadow-inner appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 ${hasError ? 'border-red-500' : 'border-gray-600'}`,
            ...(onKeyDownCallback && { onKeyDown: (e) => onKeyDownCallback(e, field, index) })
        };
    
        const getRequiredStatus = (fieldName) => {
             if (collectionName === 'revenues') return ['date', 'amount'].includes(fieldName);
             if (collectionName === 'expenses' && addMode === 'single') return ['date', 'vendorId', 'category', 'amount', 'paymentType'].includes(fieldName);
             if (collectionName === 'vendors') return ['name', 'category'].includes(fieldName);
             return false;
        };

        switch (field) {
            case 'amount':
            case 'checkAmount':
            case 'cashAmount':
            case 'payrollAmount':
            case 'payrollTax':
            case 'cash':
                 return <input type="number" step="0.01" {...commonProps} value={data[field] || ''} placeholder="0.00" required={getRequiredStatus(field)} />;
            case 'category':
                 return (
                    <select {...commonProps} value={data[field] || ''} required={getRequiredStatus(field)}>
                        <option value="">Select Category</option>
                        <option value="COGS">COGS</option>
                        <option value="Wages">Wages</option>
                        <option value="Taxes">Taxes</option>
                        <option value="Rent">Rent</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Maintenance & Repair">Maintenance & Repair</option>
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
                return <input type="date" {...commonProps} value={data[field] || ''} required={getRequiredStatus(field)} />;
            case 'paymentType':
                return (
                    <select {...commonProps} value={data[field] || ''} required={getRequiredStatus(field)}>
                        <option value="">Select Payment</option>
                        <option value="CC">CC</option>
                        <option value="Check">Check</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                );
            case 'reportable':
                return (
                    <div className="flex items-center h-full">
                        <input type="checkbox" {...commonProps} checked={!!data[field]} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500" />
                    </div>
                );
             case 'payPeriod':
                return (
                    <select {...commonProps} value={data[field] || ''} required>
                         <option value="">Select Pay Period</option>
                         {payPeriods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                );
            default:
                return <input type="text" {...commonProps} value={data[field] || ''} required={getRequiredStatus(field)} />;
        }
    };
    
     const handleKeyDown = (e, field, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.target.form;
            const formElements = Array.from(form.elements);
            const currentIndex = formElements.indexOf(e.target);
            
            // This logic is simplified; for a real app, you'd want a more robust way to find the next valid input.
            const nextElement = formElements[currentIndex + 1];
            if (nextElement) {
                nextElement.focus();
            } else if (index < expenseRows.length - 1) {
                // If at the end of a row, try to focus on the first input of the next row.
                const nextRowFirstInput = document.getElementById(`date-${index + 1}`);
                if (nextRowFirstInput) nextRowFirstInput.focus();
            }
        }
    };


    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{title}</h2>
                <div className="flex items-center gap-2">
                    {collectionName === 'expenses' && (
                         <button onClick={() => setShowStatementUpload(true)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                            Add Statement
                         </button>
                    )}
                    <button onClick={() => openForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                        <PlusIcon />
                        Add New
                    </button>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-700">
                        <h3 className="text-xl font-bold mb-4">{editingItem ? `Edit ${title.slice(0, -1)}` : `Add New ${title}`}</h3>
                        
                        {collectionName === 'expenses' && !editingItem && (
                             <div className="flex items-center justify-center space-x-4 mb-6 border-b border-gray-700 pb-4">
                               <button onClick={() => setAddMode('single')} className={`px-4 py-2 rounded-md text-sm font-medium ${addMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Single Expense</button>
                               <button onClick={() => setAddMode('multiple')} className={`px-4 py-2 rounded-md text-sm font-medium ${addMode === 'multiple' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Multiple Expenses</button>
                               <button onClick={() => setAddMode('wages')} className={`px-4 py-2 rounded-md text-sm font-medium ${addMode === 'wages' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Wages</button>
                             </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {addMode === 'multiple' && collectionName === 'expenses' && !editingItem ? (
                                <div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                                <tr>
                                                    <th className="p-2 w-1/6">Date</th>
                                                    <th className="p-2 w-1/4">Vendor</th>
                                                    <th className="p-2 w-1/6">Category</th>
                                                    <th className="p-2 w-1/6">Amount</th>
                                                    <th className="p-2 w-1/6">Payment</th>
                                                    <th className="p-2 w-1/4">Description</th>
                                                    <th className="p-2 w-auto">Report</th>
                                                    <th className="p-2 w-auto"></th>
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
                                                            <td className="p-1 text-center">{renderField('reportable', row, (e) => handleMultipleInputChange(index, e), index, handleKeyDown, false)}</td>
                                                            <td className="p-1 text-center">
                                                                <button type="button" onClick={() => removeExpenseRow(index)} className="text-red-500 hover:text-red-400">&times;</button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" onClick={addExpenseRow} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">+ Add Row</button>
                                </div>
                            ) : addMode === 'wages' && collectionName === 'expenses' && !editingItem ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div><label className="block text-gray-400 text-sm mb-1">Pay Period</label>{renderField('payPeriod', formData, handleInputChange)}</div>
                                     <div><label className="block text-gray-400 text-sm mb-1">Total Payroll (Gross)</label>{renderField('payrollAmount', formData, handleInputChange)}</div>
                                     <div><label className="block text-gray-400 text-sm mb-1">Payroll Tax</label>{renderField('payrollTax', formData, handleInputChange)}</div>
                                     <div><label className="block text-gray-400 text-sm mb-1">Cash Withdrawal (Optional)</label>{renderField('cash', formData, handleInputChange)}</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {fields.map(field => (
                                        <div key={field}>
                                            <label className="block text-gray-400 text-sm mb-1 capitalize">
                                                {field.replace(/([A-Z])/g, ' $1').replace('Id', '')}
                                            </label>
                                            {renderField(field, formData, handleInputChange)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-4 pt-6">
                                <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation Modal */}
            {itemToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-4 pt-6">
                            <button onClick={() => setItemToDelete(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showStatementUpload && (
                <StatementUploadModal 
                    onClose={() => setShowStatementUpload(false)}
                    onSave={handleBatchSave}
                    existingExpenses={expenses}
                    autoCategorize={autoCategorize}
                />
            )}

            {/* Data Table */}
            <div className="overflow-x-auto">
                 {collectionName === 'expenses' && groups && sortedCategories ? (
                    <div className="space-y-6">
                        {sortedCategories.map(groupKey => (
                            <div key={groupKey}>
                                <div onClick={() => toggleGroup(groupKey)} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-t-lg cursor-pointer">
                                    <h3 className="font-semibold text-lg">{groupKey}</h3>
                                    <div className="flex items-center gap-4">
                                         <span className="font-bold text-indigo-400">{formatCurrency(groups[groupKey].total)}</span>
                                         <ChevronDownIcon />
                                    </div>
                                </div>
                                {expandedGroups[groupKey] && (
                                     <div className="overflow-x-auto border-x border-b border-gray-700/50 rounded-b-lg">
                                        {renderTable(groups[groupKey].items)}
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>
                 ) : (
                    renderTable(sortedData)
                 )}
            </div>
        </div>
    );
    
    function renderTable(dataToRender) {
        return (
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        {fields.map(field => (
                             <th key={field} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(field)}>
                                {field.replace(/([A-Z])/g, ' $1').replace('Id', '')}
                                {sortConfig.key === field ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
                            </th>
                        ))}
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {dataToRender.map(item => (
                        <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors duration-200">
                           {fields.map(field => {
                                let cellValue = item[field];
                                if (field === 'amount') cellValue = formatCurrency(cellValue);
                                if (field === 'date' && collectionName === 'revenues') {
                                    const [year, month] = (item[field] || '').split('-');
                                    cellValue = month ? new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : item[field];
                                }
                                if (field === 'vendorId') {
                                    const vendor = vendors.find(v => v.id === item.vendorId);
                                    cellValue = vendor ? vendor.name : (item.description && item.description.includes('---') ? <span className="text-yellow-400 italic">{item.description.split('---')[0]}</span> : <span className="text-gray-500 italic">N/A</span>);
                                }
                                if (field === 'reportable') {
                                    cellValue = <input type="checkbox" checked={!!item[field]} readOnly className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-0" />;
                                }
                                return <td key={field} className="px-6 py-4">{cellValue}</td>
                           })}
                            <td className="px-6 py-4 flex items-center gap-4">
                                <button onClick={() => openForm(item)} className="text-blue-400 hover:text-blue-300"><EditIcon /></button>
                                <button onClick={() => setItemToDelete(item)} className="text-red-500 hover:text-red-400"><DeleteIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
}


function StatementUploadModal({ onClose, onSave, existingExpenses, autoCategorize }) {
    const [file, setFile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [accountInfo, setAccountInfo] = useState({ bank: '', name: '', number: '' });
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (fileToParse) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            let parsed;
            // Detect file type based on content
            if (text.includes('"Transaction Date","Posted Date","Card No.","Description","Category","Debit","Credit"')) {
                setAccountInfo({ bank: 'Capital One', name: 'SPARK 1,5% CASH SELECT', number: '' });
                parsed = parseCapitalOneCsv(text);
            } else if (text.includes('Account Number,Transaction Date,Transaction,Name,Memo,Amount')) {
                setAccountInfo({ bank: 'Bilt', name: 'Bilt Mastercard', number: ''});
                parsed = parseBiltCsv(text);
            } else if (text.includes("Account,Date,Description,Category,Type,Amount")) { // New Bilt format
                setAccountInfo({ bank: 'Bilt', name: 'Bilt Mastercard', number: ''});
                parsed = parseBiltCsv(text);
            } else if (text.includes("Account Number:,First Name:,Last Name:")) {
                parsed = parseNuVisionCsv(text);
            } else {
                alert('Unsupported file format.');
                return;
            }
            
             // Deduplication logic
            const existingSignatures = new Set(
                existingExpenses.map(exp => `${exp.date}_${Number(exp.amount).toFixed(2)}`)
            );
            
            const processed = parsed.map((t, index) => {
                const signature = `${t.date}_${Number(t.amount).toFixed(2)}`;
                const isDuplicate = existingSignatures.has(signature);
                return {
                    ...t,
                    id: index,
                    selected: !isDuplicate, // Deselect duplicates by default
                    isDuplicate: isDuplicate
                };
            });
            
            setTransactions(processed);
        };
        reader.readAsText(fileToParse);
    };
    
    const parseNuVisionCsv = (csvText) => {
        const lines = csvText.trim().split('\n');
        const headerMatch = lines[0].match(/Account Number: (\d+)/);
        const fullAccountNum = headerMatch ? headerMatch[1] : 'Unknown';
        setAccountInfo({ bank: 'NuVision', name: 'One Kitchen LLC', number: fullAccountNum.slice(-4) });
      
        const parsed = [];
        const checkAmountsToDeselect = [1116.58, 1132.54];
        const deselectionKeywords = ["wells fargo credit card"];
        
        const dataLines = lines.slice(lines.findIndex(line => line.startsWith('"Date","Description"')));
        const records = dataLines.join('\n').split('"').filter(val => val.trim() && val !== ',' && val !== '\r\n').map(el => el.trim());
        let currentRecord = [];

        for(let i=0; i < records.length; i++){
          currentRecord.push(records[i])
          if(currentRecord.length === 7){
            const [date, description, checkNum, ...rest] = currentRecord;
            const amountStr = rest.find(v => v.includes('.'));
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            const isCheck = !!checkNum;
            let shouldDeselect = false;

            if (deselectionKeywords.some(keyword => description.toLowerCase().includes(keyword))) {
                 shouldDeselect = true;
            }
            if (isCheck && checkAmountsToDeselect.some(amt => Math.abs(amount - amt) <= 0.25)) {
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
               category = autoCategorize(description, 'General Expense');
            }
            
            parsed.push({
                 date: new Date(date).toISOString().split('T')[0],
                 vendor: description.replace(/&amp;/g, '&'),
                 amount: amount,
                 category: category,
                 paymentType: isCheck ? 'Check' : 'Bank Transfer',
                 description: `NuVision x${fullAccountNum.slice(-4)}`,
                 selected: !shouldDeselect
            });
            currentRecord = [];
          }
        }
        return parsed.filter(p => p.amount > 0);
    };

    const parseBiltCsv = (csvText) => {
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',');
        const dataStartIndex = 1;

        // Determine format by header
        const isNewFormat = header.includes("Account");
        const dateIndex = isNewFormat ? header.indexOf("Date") : header.indexOf("Transaction Date");
        const descIndex = isNewFormat ? header.indexOf("Description") : header.indexOf("Name");
        const categoryIndex = header.indexOf("Category");
        const amountIndex = header.indexOf("Amount"); // Both formats use "Amount" for debits (negative)

        const parsed = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(val => val.replace(/"/g, ''));
            
            const amount = parseFloat(values[amountIndex]);
            if (amount < 0) { // Only process debits
                const description = values[descIndex];
                const categoryFromCsv = values[categoryIndex] || 'General Expense';
                const transactionDate = new Date(values[dateIndex]);

                parsed.push({
                    date: transactionDate.toISOString().split('T')[0],
                    vendor: description.replace(/&amp;/g, '&'),
                    amount: Math.abs(amount),
                    category: autoCategorize(description, categoryFromCsv),
                    paymentType: 'CC',
                    description: 'Bilt Mastercard'
                });
            }
        }
        return parsed;
    };


    const parseCapitalOneCsv = (csvText) => {
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',');
        const dataStartIndex = 1;

        const dateIndex = header.indexOf('"Transaction Date"');
        const descIndex = header.indexOf('"Description"');
        const debitIndex = header.indexOf('"Debit"');
        const categoryIndex = header.indexOf('"Category"');

        const parsed = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(val => val.replace(/"/g, ''));

            const debit = parseFloat(values[debitIndex]);
            if (debit > 0) {
                const description = values[descIndex];
                const categoryFromCsv = values[categoryIndex] || 'General Expense';
                const transactionDate = new Date(values[dateIndex]);
                
                parsed.push({
                    date: transactionDate.toISOString().split('T')[0],
                    vendor: description.replace(/&amp;/g, '&'),
                    amount: debit,
                    category: autoCategorize(description, categoryFromCsv),
                    paymentType: 'CC',
                    description: 'Capital One Spark'
                });
            }
        }
        return parsed;
    };

    const handleTransactionChange = (id, field, value) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleSelectAll = (e) => {
        const { checked } = e.target;
        setTransactions(prev => prev.map(t => t.isDuplicate ? t : { ...t, selected: checked }));
    };

    const handleSaveClick = () => {
        const selectedTransactions = transactions.filter(t => t.selected && !t.isDuplicate);
        onSave(selectedTransactions);
    };

    const savableCount = transactions.filter(t => t.selected && !t.isDuplicate).length;

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start z-50 p-4 pt-12 md:pt-24 overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className={`bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-6xl border border-gray-700`}>
                <h3 className="text-xl font-bold mb-4">Upload and Review Statement</h3>

                {!file ? (
                    <div
                        className="border-4 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition duration-300"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                        <p className="text-gray-400">Click to select a .csv file</p>
                        <p className="text-xs text-gray-500 mt-2">Supported formats: Capital One, Bilt, NuVision</p>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
                            <div>
                                <p><strong>File:</strong> {file.name}</p>
                                <p><strong>Bank:</strong> {accountInfo.bank} {accountInfo.number && `(x${accountInfo.number})`}</p>
                            </div>
                            <button onClick={() => { setFile(null); setTransactions([]); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">
                                Change File
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[50vh]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                                <tr>
                                    <th className="p-2"><input type="checkbox" onChange={handleSelectAll} checked={transactions.every(t => t.selected || t.isDuplicate)} /></th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Vendor</th>
                                    <th className="p-2">Amount</th>
                                    <th className="p-2">Category</th>
                                    <th className="p-2">Payment Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => {
                                    return (
                                     <tr key={t.id} className={`border-b border-gray-700/50 transition-colors duration-200 ${!t.selected ? 'text-gray-500 bg-gray-900/50' : 'hover:bg-gray-700/30'} ${t.isDuplicate ? 'bg-orange-900/60 opacity-60' : ''}`}>
                                        <td className="p-2">
                                            <input type="checkbox" checked={t.selected} disabled={t.isDuplicate} onChange={e => handleTransactionChange(t.id, 'selected', e.target.checked)} />
                                            {t.isDuplicate && <span className="text-xs text-orange-300 font-bold ml-1 block">DUPLICATE</span>}
                                        </td>
                                        <td className="p-2">{t.date}</td>
                                        <td className="p-2"><input type="text" value={t.vendor} onChange={e => handleTransactionChange(t.id, 'vendor', e.target.value)} className="p-1 border rounded w-full bg-gray-700 border-gray-600" /></td>
                                        <td className="p-2">{formatCurrency(t.amount)}</td>
                                        <td className="p-2">
                                             <select value={t.category} onChange={e => handleTransactionChange(t.id, 'category', e.target.value)} className="p-1 border rounded w-full bg-gray-700 border-gray-600">
                                                <option value="COGS">COGS</option>
                                                <option value="Wages">Wages</option>
                                                <option value="Taxes">Taxes</option>
                                                <option value="Rent">Rent</option>
                                                <option value="Utilities">Utilities</option>
                                                <option value="Insurance">Insurance</option>
                                                <option value="Maintenance & Repair">Maintenance & Repair</option>
                                                <option value="Professional Services">Professional Services</option>
                                                <option value="Supplies">Supplies</option>
                                                <option value="Auto & Travel">Auto & Travel</option>
                                                <option value="General Expense">General Expense</option>
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
                </div>
                )}

                <div className="flex items-center justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSaveClick} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg" disabled={savableCount === 0}>
                        Save Selected ({savableCount})
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;

