import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc,
    query,
    setLogLevel
} from 'firebase/firestore';

// --- Firebase Configuration is now handled automatically by the environment ---

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


// --- Main Application ---
export default function App() {
    const [view, setView] = useState('dashboard');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [revenues, setRevenues] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'one-kitchen-tracker';

    // 1. Initialize Firebase and Auth State
    useEffect(() => {
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
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                } else {
                    const authenticate = async () => {
                        try {
                            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                                await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                        } catch (authError) {
                            console.error("Authentication failed:", authError);
                            setIsAuthReady(true);
                            setIsLoading(false);
                        }
                    };
                    authenticate();
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setIsAuthReady(true);
            setIsLoading(false);
        }
    }, []);

    // 2. Fetch data once user is authenticated
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;

        const collectionsMeta = {
            revenues: { setter: setRevenues, ref: collection(db, `/artifacts/${appId}/users/${userId}/revenues`) },
            expenses: { setter: setExpenses, ref: collection(db, `/artifacts/${appId}/users/${userId}/expenses`) },
            vendors: { setter: setVendors, ref: collection(db, `/artifacts/${appId}/users/${userId}/vendors`) },
        };

        const collectionNames = Object.keys(collectionsMeta);
        let loadedCollections = 0;
        const totalCollections = collectionNames.length;
        
        if(totalCollections === 0) {
             setIsLoading(false);
             return;
        }

        const unsubscribes = collectionNames.map(name => {
            const { setter, ref } = collectionsMeta[name];
            const q = query(ref);
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                if (name === 'vendors') {
                    setter(data.sort((a,b) => a.name.localeCompare(b.name)));
                } else {
                    setter(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
                }

                loadedCollections++;
                if (loadedCollections === totalCollections) {
                    setIsLoading(false);
                }
                
            }, (error) => {
                console.error(`Error fetching ${name}:`, error);
                setIsLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [isAuthReady, db, userId, appId]);

    // Derived state for dashboard
    const totals = useMemo(() => {
        const totalRevenue = revenues.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        return { totalRevenue, totalExpenses, netProfit };
    }, [revenues, expenses]);

    const formatCurrency = (amount) => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(value)) return '$0.00';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    const MainContent = () => {
        if (!isAuthReady || isLoading) return <LoadingSpinner />;
        
        switch (view) {
            case 'dashboard':
                return <DashboardView totals={totals} revenues={revenues} expenses={expenses} formatCurrency={formatCurrency} />;
            case 'revenue':
                return <CrudView title="Revenue" data={revenues} db={db} userId={userId} appId={appId} collectionName="revenues" fields={['description', 'amount', 'date']} formatCurrency={formatCurrency} vendors={vendors} />;
            case 'expenses':
                return <CrudView title="Expenses" data={expenses} db={db} userId={userId} appId={appId} collectionName="expenses" fields={['description', 'amount', 'date', 'vendorId']} formatCurrency={formatCurrency} vendors={vendors} />;
            case 'vendors':
                return <CrudView title="Vendors" data={vendors} db={db} userId={userId} appId={appId} collectionName="vendors" fields={['name', 'contact', 'email']} formatCurrency={formatCurrency} />;
            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <div className="w-full bg-gray-800/30 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-10">
                <header className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center">
                    <h1 className="text-3xl font-bold text-white">One Kitchen <span className="text-indigo-400">Tracker</span></h1>
                    <nav className="mt-4 md:mt-0 flex items-center bg-gray-900/50 border border-gray-700/50 rounded-full px-2 py-1">
                        <NavButton text="Dashboard" viewName="dashboard" currentView={view} setView={setView} />
                        <NavButton text="Revenue" viewName="revenue" currentView={view} setView={setView} />
                        <NavButton text="Expenses" viewName="expenses" currentView={view} setView={setView} />
                        <NavButton text="Vendors" viewName="vendors" currentView={view} setView={setView} />
                    </nav>
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


// --- View Components ---

function DashboardView({ totals, revenues, expenses, formatCurrency }) {
    return (
        <div className="space-y-8">
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
                        {revenues.length > 0 ? revenues.slice(0, 5).map(r => (
                            <li key={r.id} className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                               <span className="text-gray-300">{r.description}</span>
                               <span className="text-green-400 font-semibold">{formatCurrency(r.amount)}</span>
                            </li>
                        )) : <p className="text-gray-500">No revenue entries yet.</p>}
                    </ul>
                 </Card>
                 <Card title="Recent Expenses">
                    <ul className="space-y-3">
                         {expenses.length > 0 ? expenses.slice(0, 5).map(e => (
                            <li key={e.id} className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                               <span className="text-gray-300">{e.description}</span>
                               <span className="text-red-400 font-semibold">{formatCurrency(e.amount)}</span>
                            </li>
                        )) : <p className="text-gray-500">No expense entries yet.</p>}
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

    useEffect(() => {
        if (editingItem) {
            setFormData(editingItem);
            setShowForm(true);
        } else {
            const initialData = fields.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
            if (fields.includes('date')) initialData.date = new Date().toISOString().split('T')[0];
            setFormData(initialData);
        }
    }, [editingItem, fields]);
    
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;

        const dataToSave = { ...formData };
        if (dataToSave.amount) dataToSave.amount = parseFloat(dataToSave.amount);

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

    const openForm = (item = null) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingItem(null);
    };

    const getVendorName = (vendorId) => {
        if (!vendors || !vendorId) return 'N/A';
        const vendor = vendors.find(v => v.id === vendorId);
        return vendor ? vendor.name : 'Unknown Vendor';
    };

    return (
        <Card title={`${title} Records`}>
            <div className="flex justify-end mb-6">
                <button onClick={() => openForm()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md">
                    <PlusIcon /> Add {title}
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                        <h2 className="text-2xl font-bold mb-6 text-white">{editingItem ? 'Edit' : 'Add'} {title}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {fields.map(field => (
                                <div key={field}>
                                    <label className="block text-gray-400 text-sm font-bold mb-2 capitalize" htmlFor={field}>
                                        {field.replace('Id', '')}
                                    </label>
                                    {field === 'vendorId' ? (
                                        <select
                                            name="vendorId"
                                            id="vendorId"
                                            value={formData.vendorId || ''}
                                            onChange={handleInputChange}
                                            className="shadow-inner appearance-none border rounded w-full py-3 px-4 bg-gray-700/50 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select Vendor</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type={field === 'amount' ? 'number' : field === 'date' ? 'date' : field === 'email' ? 'email' : 'text'}
                                            step={field === 'amount' ? '0.01' : undefined}
                                            name={field}
                                            id={field}
                                            value={formData[field] || ''}
                                            onChange={handleInputChange}
                                            className="shadow-inner appearance-none border rounded w-full py-3 px-4 bg-gray-700/50 border-gray-600 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button type="button" onClick={closeForm} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {itemToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-gray-700">
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

            <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="border-b border-gray-700/50">
                            {fields.map(f => <th key={f} className="p-4 capitalize text-sm font-semibold text-gray-400">{f.replace('Id', '')}</th>)}
                            <th className="p-4 text-sm font-semibold text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length > 0 ? data.map(item => (
                            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-700/20">
                                {fields.map(field => (
                                    <td key={field} className="p-4 text-gray-300">
                                        {field === 'amount' ? formatCurrency(item[field]) 
                                        : field === 'vendorId' ? getVendorName(item[field])
                                        : item[field]}
                                    </td>
                                ))}
                                <td className="p-4 flex gap-4 items-center">
                                    <button onClick={() => openForm(item)} className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200"><EditIcon /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 transition-colors duration-200"><DeleteIcon /></button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={fields.length + 1} className="text-center p-8 text-gray-500">No {title.toLowerCase()} records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

