document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---

    // Views
    const dashboardView = document.getElementById('dashboardView');
    const clientDetailView = document.getElementById('clientDetailView');

    // Clients Dashboard
    const clientsGrid = document.getElementById('clientsGrid');
    const suppliersGrid = document.getElementById('suppliersGrid');
    const clientsEmptyState = document.getElementById('clientsEmptyState');
    const suppliersEmptyState = document.getElementById('suppliersEmptyState');
    const clientSearchInput = document.getElementById('clientSearchInput');
    const supplierSearchInput = document.getElementById('supplierSearchInput');
    const addClientBtn = document.getElementById('addClientBtn');
    const addSupplierBtn = document.getElementById('addSupplierBtn');

    // View Switching
    const viewClientsBtn = document.getElementById('viewClientsBtn');
    const viewSuppliersBtn = document.getElementById('viewSuppliersBtn');
    const mainTitle = document.querySelector('h1');

    // Client Detail
    const clientDetailTitle = document.getElementById('clientDetailTitle');
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    const addPortalBtn = document.getElementById('addPortalBtn');
    const addContactBtn = document.getElementById('addContactBtn');
    const contactsList = document.getElementById('contactsList');
    const contactsEmptyState = document.getElementById('contactsEmptyState');

    // Client Modal
    const clientModal = document.getElementById('clientModal');
    const closeClientModalBtns = document.querySelectorAll('.close-client-modal');
    const clientForm = document.getElementById('clientForm');

    // Contact Modal
    const contactModal = document.getElementById('contactModal');
    const closeContactModalBtns = document.querySelectorAll('.close-contact-modal');
    const contactForm = document.getElementById('contactForm');
    const contactModalTitle = document.getElementById('contactModalTitle');

    // Fields
    // Portal Modal
    const portalModal = document.getElementById('portalModal');
    const closePortalModalBtns = document.querySelectorAll('.close-portal-modal');
    const portalForm = document.getElementById('portalForm');
    const clientHasPortalCheckbox = document.getElementById('clientHasPortal');
    const clientPortalFields = document.getElementById('clientPortalFields');
    const clientPortalText = document.getElementById('clientPortalText');

    // Credentials Modal
    const credentialsModal = document.getElementById('credentialsModal');
    const closeCredentialsModalBtns = document.querySelectorAll('.close-credentials-modal');
    const displayUser = document.getElementById('displayUser');
    const displayPass = document.getElementById('displayPass');

    // Supplier Modal
    const supplierModal = document.getElementById('supplierModal');
    const closeSupplierModalBtns = document.querySelectorAll('.close-supplier-modal');
    const supplierForm = document.getElementById('supplierForm');
    const supplierModalTitle = document.getElementById('supplierModalTitle');

    // Supplier Delete Confirm Modal
    const supplierDeleteConfirmModal = document.getElementById('supplierDeleteConfirmModal');
    const closeSupplierDeleteModalBtns = document.querySelectorAll('.close-supplier-delete-modal');
    const confirmSupplierDeleteBtn = document.getElementById('confirmSupplierDeleteBtn');
    let supplierToDeleteId = null;

    // Client Delete Confirm Modal
    const clientDeleteConfirmModal = document.getElementById('clientDeleteConfirmModal');
    const closeClientDeleteModalBtns = document.querySelectorAll('.close-client-delete-modal');
    const confirmClientDeleteBtn = document.getElementById('confirmClientDeleteBtn');
    let clientToDeleteId = null;

    // Edit Client Modal
    const editClientModal = document.getElementById('editClientModal');
    const closeEditClientModalBtns = document.querySelectorAll('.close-edit-client-modal');
    const editClientForm = document.getElementById('editClientForm');

    // Delete Confirm Modal
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModalBtns = document.querySelectorAll('.close-delete-modal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    let contactToDeleteId = null;

    // Observations Modal
    const observationsModal = document.getElementById('observationsModal');
    const closeObservationsModalBtns = document.querySelectorAll('.close-observations-modal');
    const observationText = document.getElementById('observationText');

    // --- State ---
    let clients = [];
    let suppliers = [];
    let currentView = 'clients'; // 'clients' or 'suppliers'
    let currentClient = null; // Stores the currently selected client object (with nested contacts)

    // --- Functions ---

    // 1. Clients Logic
    async function fetchClients(search = '') {
        try {
            const res = await fetch('/api/clients');
            const allClients = await res.json();

            // Client-side filtering for search
            if (search) {
                const lowerSearch = search.toLowerCase();
                clients = allClients.filter(c => c.name.toLowerCase().includes(lowerSearch));
            } else {
                clients = allClients;
            }

            renderClientsGrid();
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    }

    async function fetchSuppliers(search = '') {
        try {
            const res = await fetch('/api/suppliers');
            const allSuppliers = await res.json();
            if (search) {
                const lowerSearch = search.toLowerCase();
                suppliers = allSuppliers.filter(s => s.name.toLowerCase().includes(lowerSearch));
            } else {
                suppliers = allSuppliers;
            }
            renderSuppliersGrid();
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    }

    function renderClientsGrid() {
        clientsGrid.innerHTML = '';
        if (clients.length === 0) {
            clientsEmptyState.classList.remove('hidden');
            return;
        }
        clientsEmptyState.classList.add('hidden');

        // Sort clients alphabetically by name
        const sortedClients = [...clients].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );

        sortedClients.forEach(client => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.onclick = (e) => {
                if (e.target.closest('.portal-actions')) return;
                openClientDetails(client.id);
            };

            let buttonsHtml = '';

            // Portal Buttons
            if (client.hasPortal && client.portalUrl) {
                const user = client.portalUser || 'N/A';
                const pass = client.portalPass || 'N/A';

                buttonsHtml += `
                    <a href="${client.portalUrl}" target="_blank" class="btn-portal link" title="Link portal">
                        <i class="fa-solid fa-link"></i>
                    </a>
                    <button class="btn-portal creds" onclick="showCredentials('${user}', '${pass}')" title="Credenciales">
                        <i class="fa-solid fa-key"></i>
                    </button>
                `;
            }

            // Edit/Delete Buttons (Always present)
            buttonsHtml += `
                <button class="btn-portal creds" onclick="openEditClientModal(${client.id}, '${client.name}')" title="Editar Nombre">
                    <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="btn-portal creds" onclick="deleteClient(${client.id})" title="Eliminar Cliente" style="border-color: #ef4444; color: #ef4444;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            card.innerHTML = `
                 <div class="client-info">
                     <h3>${client.name}</h3>
                     <div class="portal-actions">
                        ${buttonsHtml}
                     </div>
                 </div>
             `;
            clientsGrid.appendChild(card);
        });
    }

    function renderSuppliersGrid() {
        suppliersGrid.innerHTML = '';
        if (suppliers.length === 0) {
            suppliersEmptyState.classList.remove('hidden');
            return;
        }
        suppliersEmptyState.classList.add('hidden');

        const sortedSuppliers = [...suppliers].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        );

        sortedSuppliers.forEach(supplier => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.onclick = (e) => {
                if (e.target.closest('.portal-actions')) return;
                openSupplierModal('edit', supplier.id);
            };

            let portalButtons = `
                <div class="portal-actions">
                    <button class="btn-portal creds" onclick="deleteSupplier(${supplier.id})" title="Eliminar" style="border-color: #ef4444; color: #ef4444;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            if (supplier.portalUrl) {
                const user = supplier.portalUser || 'N/A';
                const pass = supplier.portalPass || 'N/A';
                portalButtons = `
                    <div class="portal-actions">
                        <a href="${supplier.portalUrl}" target="_blank" class="btn-portal link" title="Link portal">
                            <i class="fa-solid fa-link"></i>
                        </a>
                        <button class="btn-portal creds" onclick="showCredentials('${user}', '${pass}')" title="Credenciales">
                            <i class="fa-solid fa-key"></i>
                        </button>
                        <button class="btn-portal creds" onclick="deleteSupplier(${supplier.id})" title="Eliminar" style="border-color: #ef4444; color: #ef4444;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                 <div class="client-info">
                     <h3>${supplier.name}</h3>
                     ${portalButtons}
                 </div>
             `;
            suppliersGrid.appendChild(card);
        });
    }

    // credentials helper
    window.showCredentials = (user, pass) => {
        displayUser.textContent = user;
        displayPass.textContent = pass;
        credentialsModal.classList.add('active');
    };

    window.copyToClipboard = (elementId) => {
        const text = document.getElementById(elementId).textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector(`[onclick="copyToClipboard('${elementId}')"]`);
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 2000);
        });
    };

    // 2. Navigation & Views
    async function openClientDetails(clientId) {
        try {
            const res = await fetch(`/api/clients/${clientId}`);
            if (!res.ok) throw new Error('Client not found');

            currentClient = await res.json();

            clientDetailTitle.textContent = currentClient.name;
            renderContactsList();

            // Switch Views
            dashboardView.classList.add('hidden');
            clientDetailView.classList.remove('hidden');
        } catch (error) {
            console.error('Error opening client details:', error);
            alert('No se pudo cargar la información del cliente.');
        }
    }

    function showDashboard() {
        currentClient = null;
        dashboardView.classList.remove('hidden');
        clientDetailView.classList.add('hidden');
        if (currentView === 'clients') {
            fetchClients(clientSearchInput.value);
        } else {
            fetchSuppliers(supplierSearchInput.value);
        }
    }

    function switchView(view) {
        currentView = view;
        if (view === 'clients') {
            viewClientsBtn.classList.add('active');
            viewSuppliersBtn.classList.remove('active');
            clientsGrid.classList.remove('hidden');
            suppliersGrid.classList.add('hidden');
            addClientBtn.classList.remove('hidden');
            addSupplierBtn.classList.add('hidden');
            clientSearchInput.classList.remove('hidden');
            supplierSearchInput.classList.add('hidden');
            fetchClients(clientSearchInput.value);
        } else {
            viewClientsBtn.classList.remove('active');
            viewSuppliersBtn.classList.add('active');
            clientsGrid.classList.add('hidden');
            suppliersGrid.classList.remove('hidden');
            addClientBtn.classList.add('hidden');
            addSupplierBtn.classList.remove('hidden');
            clientSearchInput.classList.add('hidden');
            supplierSearchInput.classList.remove('hidden');
            fetchSuppliers(supplierSearchInput.value);
        }
    }

    // 3. Contacts Logic
    function renderContactsList() {
        contactsList.innerHTML = '';
        const contacts = currentClient.contacts || [];

        if (contacts.length === 0) {
            contactsEmptyState.classList.remove('hidden');
            return;
        }
        contactsEmptyState.classList.add('hidden');

        // Create Table Structure
        const tableContainer = document.createElement('div');
        tableContainer.className = 'contacts-table-container';

        const table = document.createElement('table');
        table.className = 'contacts-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nombre y Apellido</th>
                    <th>Email</th>
                    <th>Cargo</th>
                    <th>Teléfono</th>
                    <th>Observaciones</th>
                    <th style="width: 80px;">Acciones</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        contacts.forEach(contact => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="contact-name">${contact.name || '-'}</div>
                </td>
                <td>
                    ${contact.email ? `<a href="mailto:${contact.email}" class="text-link">${contact.email}</a>` : '-'}
                </td>
                <td>${contact.department || '-'}</td>
                <td>${contact.phone || '-'}</td>
                <td style="text-align: center;">
                    ${contact.observations ? `
                        <button class="btn-observation view-observations-btn" title="Ver observaciones">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    ` : '-'}
                </td>
                <td class="actions-cell">
                    <button class="btn-action edit edit-contact-btn" title="Editar">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-action delete delete-contact-btn" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;

            // Attach event listeners safely
            if (contact.observations) {
                tr.querySelector('.view-observations-btn').onclick = () => openObservationsModal(contact.observations);
            }
            tr.querySelector('.edit-contact-btn').onclick = () => openContactModal('edit', contact.id);
            tr.querySelector('.delete-contact-btn').onclick = () => deleteContact(contact.id);

            tbody.appendChild(tr);
        });

        tableContainer.appendChild(table);
        contactsList.appendChild(tableContainer);
    }

    function openObservationsModal(text) {
        observationText.textContent = text;
        observationsModal.classList.add('active');
    }

    function closeObservationsModalFunc() {
        observationsModal.classList.remove('active');
    }

    closeObservationsModalBtns.forEach(btn => {
        btn.addEventListener('click', closeObservationsModalFunc);
    });

    window.addEventListener('click', (e) => {
        if (e.target === observationsModal) closeObservationsModalFunc();
    });


    // --- Modals & Forms ---

    // Dynamic Contact Forms in Client Modal
    const newClientContactsContainer = document.getElementById('newClientContactsContainer');
    const addContactToClientBtn = document.getElementById('addContactToClientBtn');
    let clientContactIndex = 0;

    function createContactFormRow(index) {
        const rowId = `contact-row-${index}`;
        const div = document.createElement('div');
        div.className = 'contact-form-row glass-panel';
        div.style.padding = '1.5rem';
        div.style.marginBottom = '1.5rem';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: var(--text-light);">Contacto #${index + 1}</h4>
                <button type="button" class="btn-icon delete remove-contact-row" data-id="${rowId}"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="form-group">
                <label>Nombre y Apellido</label>
                <input type="text" name="name" class="c-name" placeholder="Ej: Juan Pérez">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="text" name="email" class="c-email" placeholder="email@empresa.com">
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="text" name="phone" class="c-phone" placeholder="+34...">
                </div>
            </div>
            <div class="form-group">
                <label>Departamento</label>
                <input type="text" name="department" class="c-department" placeholder="Ventas, ...">
            </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea class="c-observations" rows="2" placeholder="Notas..."></textarea>
                </div>
        `;
        return div;
    }

    addContactToClientBtn.addEventListener('click', () => {
        const row = createContactFormRow(clientContactIndex++);
        newClientContactsContainer.appendChild(row);
    });

    // Delegated event for removing rows and toggling portal
    newClientContactsContainer.addEventListener('click', (e) => {
        // Remove row
        if (e.target.closest('.remove-contact-row')) {
            const btn = e.target.closest('.remove-contact-row');
            document.getElementById(btn.dataset.id).remove(); // This won't work directly because we didn't set ID on the div itself correctly in innerHTML execution context relative to variable. 
            // Fix: remove the parent element.
            btn.closest('.contact-form-row').remove();
        }
    });



    function openClientModal() {
        clientForm.reset();
        newClientContactsContainer.innerHTML = ''; // Clear dynamic contacts
        clientContactIndex = 0;
        clientModal.classList.add('active');
        document.getElementById('clientName').focus();
    }

    function closeClientModalFunc() {
        clientModal.classList.remove('active');
    }

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('clientName').value;

        // Harvest contacts
        const contacts = [];
        const rows = newClientContactsContainer.querySelectorAll('.contact-form-row');

        rows.forEach(row => {
            contacts.push({
                name: row.querySelector('.c-name').value,
                email: row.querySelector('.c-email').value,
                phone: row.querySelector('.c-phone').value,
                department: row.querySelector('.c-department').value,
                observations: row.querySelector('.c-observations').value
            });
        });

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, contacts })
            });

            if (res.ok) {
                closeClientModalFunc();
                fetchClients();
            } else {
                alert('Error al crear cliente');
            }
        } catch (error) {
            console.error(error);
        }
    });

    // CONTACT Modal
    window.openContactModal = (mode = 'create', contactId = null) => {
        if (!currentClient) return;

        if (mode === 'edit' && contactId) {
            const contact = currentClient.contacts.find(c => c.id === contactId);
            if (!contact) return;

            document.getElementById('contactId').value = contact.id;
            document.getElementById('contactName').value = contact.name || '';
            document.getElementById('email').value = contact.email || '';
            document.getElementById('phone').value = contact.phone || '';
            document.getElementById('department').value = contact.department || '';
            document.getElementById('observations').value = contact.observations || '';

            contactModalTitle.textContent = 'Editar Contacto';
        } else {
            contactForm.reset();
            document.getElementById('contactId').value = '';
            document.getElementById('contactClientId').value = currentClient.id; // Link to current client
            contactModalTitle.textContent = `Nuevo Contacto para ${currentClient.name}`;
        }

        contactModal.classList.add('active');
    };

    function openPortalModal() {
        if (!currentClient) return;

        document.getElementById('portalClientId').value = currentClient.id;
        clientHasPortalCheckbox.checked = currentClient.hasPortal;
        document.getElementById('clientPortalUrl').value = currentClient.portalUrl || '';
        document.getElementById('clientPortalUser').value = currentClient.portalUser || '';
        document.getElementById('clientPortalPass').value = currentClient.portalPass || '';

        togglePortalFields();
        portalModal.classList.add('active');
    }

    function closePortalModalFunc() {
        portalModal.classList.remove('active');
    }

    function togglePortalFields() {
        if (clientHasPortalCheckbox.checked) {
            clientPortalFields.classList.remove('hidden');
            clientPortalText.textContent = 'Si';
        } else {
            clientPortalFields.classList.add('hidden');
            clientPortalText.textContent = 'No';
        }
    }

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const contactId = document.getElementById('contactId').value;
        // If creating, we need the clientId from currentClient context
        const clientId = currentClient.id;

        const formData = {
            clientId: clientId, // Important for creation
            name: document.getElementById('contactName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            department: document.getElementById('department').value,
            observations: document.getElementById('observations').value
        };

        const method = contactId ? 'PUT' : 'POST';
        let url = contactId ? `/api/contacts/${contactId}` : `/api/clients/${clientId}/contacts`;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                closeContactModalFunc();
                openClientDetails(currentClient.id);
            } else {
                alert('Error al guardar contacto');
            }
        } catch (error) {
            console.error('Error saving contact:', error);
        }
    });

    portalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientId = document.getElementById('portalClientId').value;
        const formData = {
            hasPortal: clientHasPortalCheckbox.checked,
            portalUrl: document.getElementById('clientPortalUrl').value,
            portalUser: document.getElementById('clientPortalUser').value,
            portalPass: document.getElementById('clientPortalPass').value
        };

        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                closePortalModalFunc();
                openClientDetails(clientId);
            } else {
                alert('Error al guardar configuración del portal');
            }
        } catch (error) {
            console.error('Error saving portal settings:', error);
        }
    });

    function closeContactModalFunc() {
        contactModal.classList.remove('active');
    }

    // SUPPLIER Modal
    window.openSupplierModal = async (mode = 'create', id = null) => {
        if (mode === 'edit' && id) {
            try {
                const res = await fetch(`/api/suppliers/${id}`);
                const supplier = await res.json();
                document.getElementById('supplierId').value = supplier.id;
                document.getElementById('supplierName').value = supplier.name;
                document.getElementById('supplierPortalUrl').value = supplier.portalUrl || '';
                document.getElementById('supplierPortalUser').value = supplier.portalUser || '';
                document.getElementById('supplierPortalPass').value = supplier.portalPass || '';
                document.getElementById('supplierObservations').value = supplier.observations || '';
                supplierModalTitle.textContent = 'Editar Proveedor';
            } catch (err) { console.error(err); }
        } else {
            supplierForm.reset();
            document.getElementById('supplierId').value = '';
            supplierModalTitle.textContent = 'Nuevo Proveedor';
        }
        supplierModal.classList.add('active');
    };

    function closeSupplierModalFunc() {
        supplierModal.classList.remove('active');
    }

    supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('supplierId').value;
        const formData = {
            name: document.getElementById('supplierName').value,
            portalUrl: document.getElementById('supplierPortalUrl').value,
            portalUser: document.getElementById('supplierPortalUser').value,
            portalPass: document.getElementById('supplierPortalPass').value,
            observations: document.getElementById('supplierObservations').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/suppliers/${id}` : '/api/suppliers';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                closeSupplierModalFunc();
                fetchSuppliers();
            } else {
                alert('Error al guardar proveedor');
            }
        } catch (err) { console.error(err); }
    });

    // --- Global Actions (Delete) ---
    // --- Global Actions (Delete) ---
    // Edit Client Name
    window.openEditClientModal = (id, currentName) => {
        document.getElementById('editClientId').value = id;
        document.getElementById('editClientName').value = currentName;
        editClientModal.classList.add('active');
    };

    function closeEditClientModalFunc() {
        editClientModal.classList.remove('active');
    }

    editClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editClientId').value;
        const name = document.getElementById('editClientName').value;

        try {
            // first fetch current client data to preserve other fields
            const currentRes = await fetch(`/api/clients/${id}`);
            const currentData = await currentRes.json();

            const res = await fetch(`/api/clients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentData, name }) // Maintain other fields, update name
            });

            if (res.ok) {
                closeEditClientModalFunc();
                fetchClients(); // Refresh list
            } else {
                alert('Error al actualizar nombre del cliente');
            }
        } catch (error) {
            console.error(error);
        }
    });


    window.deleteClient = (id) => {
        clientToDeleteId = id;
        clientDeleteConfirmModal.classList.add('active');
    };

    confirmClientDeleteBtn.onclick = async () => {
        if (!clientToDeleteId) return;
        try {
            const res = await fetch(`/api/clients/${clientToDeleteId}`, { method: 'DELETE' });
            if (res.ok) {
                clientDeleteConfirmModal.classList.remove('active');
                fetchClients();
            } else {
                alert('Error al borrar cliente');
            }
        } catch (error) {
            console.error(error);
        } finally {
            clientToDeleteId = null;
        }
    };

    window.deleteContact = (id) => {
        contactToDeleteId = id;
        deleteConfirmModal.classList.add('active');
    };

    confirmDeleteBtn.onclick = async () => {
        if (!contactToDeleteId) return;
        try {
            const res = await fetch(`/api/contacts/${contactToDeleteId}`, { method: 'DELETE' });
            if (res.ok) {
                deleteConfirmModal.classList.remove('active');
                openClientDetails(currentClient.id); // Refresh
            } else {
                alert('Error al borrar contacto');
            }
        } catch (error) {
            console.error(error);
        } finally {
            contactToDeleteId = null;
        }
    };

    // --- Event Listeners ---
    addClientBtn.addEventListener('click', openClientModal);
    addPortalBtn.addEventListener('click', openPortalModal);
    addContactBtn.addEventListener('click', () => openContactModal('create'));
    backToDashboardBtn.addEventListener('click', showDashboard);

    // Modal Closers
    closeClientModalBtns.forEach(btn => btn.addEventListener('click', closeClientModalFunc));
    closeContactModalBtns.forEach(btn => btn.addEventListener('click', closeContactModalFunc));
    closePortalModalBtns.forEach(btn => btn.addEventListener('click', closePortalModalFunc));

    // Outside click closes modals
    clientModal.addEventListener('click', (e) => { if (e.target === clientModal) closeClientModalFunc(); });
    contactModal.addEventListener('click', (e) => { if (e.target === contactModal) closeContactModalFunc(); });
    portalModal.addEventListener('click', (e) => { if (e.target === portalModal) closePortalModalFunc(); });
    credentialsModal.addEventListener('click', (e) => { if (e.target === credentialsModal) credentialsModal.classList.remove('active'); });
    deleteConfirmModal.addEventListener('click', (e) => { if (e.target === deleteConfirmModal) deleteConfirmModal.classList.remove('active'); });

    closeCredentialsModalBtns.forEach(btn => btn.addEventListener('click', () => credentialsModal.classList.remove('active')));
    closeDeleteModalBtns.forEach(btn => btn.addEventListener('click', () => deleteConfirmModal.classList.remove('active')));

    clientHasPortalCheckbox.addEventListener('change', togglePortalFields);

    clientSearchInput.addEventListener('input', (e) => fetchClients(e.target.value));

    // --- Init ---
    viewClientsBtn.addEventListener('click', () => switchView('clients'));
    viewSuppliersBtn.addEventListener('click', () => switchView('suppliers'));
    addSupplierBtn.addEventListener('click', () => openSupplierModal('create'));

    closeSupplierModalBtns.forEach(btn => btn.addEventListener('click', closeSupplierModalFunc));
    supplierModal.addEventListener('click', (e) => { if (e.target === supplierModal) closeSupplierModalFunc(); });

    window.deleteSupplier = (id) => {
        supplierToDeleteId = id;
        supplierDeleteConfirmModal.classList.add('active');
    };

    closeSupplierDeleteModalBtns.forEach(btn => btn.addEventListener('click', () => supplierDeleteConfirmModal.classList.remove('active')));
    supplierDeleteConfirmModal.addEventListener('click', (e) => { if (e.target === supplierDeleteConfirmModal) supplierDeleteConfirmModal.classList.remove('active'); });

    // Client Delete & Edit Modal Listeners
    closeClientDeleteModalBtns.forEach(btn => btn.addEventListener('click', () => clientDeleteConfirmModal.classList.remove('active')));
    clientDeleteConfirmModal.addEventListener('click', (e) => { if (e.target === clientDeleteConfirmModal) clientDeleteConfirmModal.classList.remove('active'); });

    closeEditClientModalBtns.forEach(btn => btn.addEventListener('click', closeEditClientModalFunc));
    editClientModal.addEventListener('click', (e) => { if (e.target === editClientModal) closeEditClientModalFunc(); });

    confirmSupplierDeleteBtn.onclick = async () => {
        if (!supplierToDeleteId) return;
        try {
            const res = await fetch(`/api/suppliers/${supplierToDeleteId}`, { method: 'DELETE' });
            if (res.ok) {
                supplierDeleteConfirmModal.classList.remove('active');
                fetchSuppliers();
            } else {
                alert('Error al borrar proveedor');
            }
        } catch (error) {
            console.error(error);
        } finally {
            supplierToDeleteId = null;
        }
    };

    supplierSearchInput.addEventListener('input', (e) => fetchSuppliers(e.target.value));

    fetchClients();
});
