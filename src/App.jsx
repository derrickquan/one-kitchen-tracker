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
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full w-full">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);
const Card = ({ title, children }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
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

                if (loadedCollections < collectionNames.length) {
                    loadedCollections++;
                    if (loadedCollections === collectionNames.length) {
                        setIsLoading(false);
                    }
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
        <div className="bg-slate-900 text-slate-200 min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">One Kitchen <span className="text-blue-400">Tracker</span></h1>
                    <nav className="mt-4 md:mt-0">
                        <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md mr-2 transition ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Dashboard</button>
                        <button onClick={() => setView('revenue')} className={`px-4 py-2 rounded-md mr-2 transition ${view === 'revenue' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Revenue</button>
                        <button onClick={() => setView('expenses')} className={`px-4 py-2 rounded-md mr-2 transition ${view === 'expenses' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Expenses</button>
                        <button onClick={() => setView('vendors')} className={`px-4 py-2 rounded-md transition ${view === 'vendors' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Vendors</button>
                    </nav>
                </header>
                <main>
                    <MainContent />
                </main>
            </div>
        </div>
    );
}

// --- View Components ---

function DashboardView({ totals, revenues, expenses, formatCurrency }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Total Revenue">
                <p className="text-4xl font-bold text-green-400">{formatCurrency(totals.totalRevenue)}</p>
            </Card>
            <Card title="Total Expenses">
                <p className="text-4xl font-bold text-red-400">{formatCurrency(totals.totalExpenses)}</p>
            </Card>
            <Card title="Net Profit">
                <p className={`text-4xl font-bold ${totals.netProfit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrency(totals.netProfit)}</p>
            </Card>
            <div className="md:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="Recent Revenue">
                    {revenues.slice(0, 5).map(r => (
                        <div key={r.id} className="flex justify-between items-center border-b border-slate-700 py-2">
                           <span>{r.description}</span>
                           <span className="text-green-400 font-semibold">{formatCurrency(r.amount)}</span>
                        </div>
                    ))}
                 </Card>
                 <Card title="Recent Expenses">
                     {expenses.slice(0, 5).map(e => (
                        <div key={e.id} className="flex justify-between items-center border-b border-slate-700 py-2">
                           <span>{e.description}</span>
                           <span className="text-red-400 font-semibold">{formatCurrency(e.amount)}</span>
                        </div>
                    ))}
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
        <Card title={title}>
            <div className="flex justify-end mb-4">
                <button onClick={() => openForm()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    <PlusIcon /> Add {title}
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6 text-white">{editingItem ? 'Edit' : 'Add'} {title}</h2>
                        <form onSubmit={handleSubmit}>
                            {fields.map(field => (
                                <div key={field} className="mb-4">
                                    <label className="block text-slate-400 text-sm font-bold mb-2 capitalize" htmlFor={field}>
                                        {field.replace('Id', '')}
                                    </label>
                                    {field === 'vendorId' ? (
                                        <select
                                            name="vendorId"
                                            id="vendorId"
                                            value={formData.vendorId || ''}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 bg-slate-700 border-slate-600 text-white leading-tight focus:outline-none focus:shadow-outline"
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
                                            className="shadow appearance-none border rounded w-full py-2 px-3 bg-slate-700 border-slate-600 text-white leading-tight focus:outline-none focus:shadow-outline"
                                            required
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex items-center justify-end gap-4 mt-6">
                                <button type="button" onClick={closeForm} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded transition">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {itemToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
                    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md text-center">
                        <h2 className="text-2xl font-bold mb-6 text-white">Confirm Deletion</h2>
                        <p className="text-slate-300 mb-8">Are you sure you want to delete this item? This action cannot be undone.</p>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={cancelDelete} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded transition">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700">
                            {fields.map(f => <th key={f} className="p-4 capitalize">{f.replace('Id', '')}</th>)}
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                                {fields.map(field => (
                                    <td key={field} className="p-4">
                                        {field === 'amount' ? formatCurrency(item[field]) 
                                        : field === 'vendorId' ? getVendorName(item[field])
                                        : item[field]}
                                    </td>
                                ))}
                                <td className="p-4 flex gap-4">
                                    <button onClick={() => openForm(item)} className="text-blue-400 hover:text-blue-300"><EditIcon /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><DeleteIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

