const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// --- API Routes ---

// --- API Routes ---

// === CLIENTS ===

// GET /api/clients - List all clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { contacts: true } }
      }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/clients - Create new client with optional contacts
app.post('/api/clients', async (req, res) => {
  try {
    const { name, hasPortal, portalUrl, portalUser, portalPass, contacts } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Prepare nested data if contacts exist
    const data = {
      name,
      hasPortal: Boolean(hasPortal),
      portalUrl,
      portalUser,
      portalPass
    };
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      data.contacts = {
        create: contacts.map(c => ({
          name: c.name,
          email: c.email,
          department: c.department,
          phone: c.phone,
          observations: c.observations
        }))
      };
    }

    const newClient = await prisma.client.create({
      data: data,
      include: { contacts: true } // Return created contacts too
    });
    res.json(newClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// GET /api/clients/:id - Get specific client with all contacts
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: { contacts: { orderBy: { createdAt: 'desc' } } }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// PUT /api/clients/:id - Update client (including portal info)
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hasPortal, portalUrl, portalUser, portalPass } = req.body;

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name,
        hasPortal: Boolean(hasPortal),
        portalUrl,
        portalUser,
        portalPass
      }
    });
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id - Delete client (and cascade contacts)
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// === CONTACTS ===

// POST /api/clients/:id/contacts - Add contact to a client
app.post('/api/clients/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, phone, observations } = req.body;

    const newContact = await prisma.contact.create({
      data: {
        clientId: parseInt(id),
        name,
        email,
        department,
        phone,
        observations
      }
    });
    res.json(newContact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - Update contact
app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, phone, observations } = req.body;

    const updatedContact = await prisma.contact.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        department,
        phone,
        observations
      }
    });
    res.json(updatedContact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Delete contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contact.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// === SUPPLIERS ===

// GET /api/suppliers - List all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST /api/suppliers - Create new supplier
app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, portalUrl, portalUser, portalPass, observations } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const newSupplier = await prisma.supplier.create({
      data: { name, portalUrl, portalUser, portalPass, observations }
    });
    res.json(newSupplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// GET /api/suppliers/:id - Get specific supplier
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch supplier details' });
  }
});

// PUT /api/suppliers/:id - Update supplier
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, portalUrl, portalUser, portalPass, observations } = req.body;

    const updatedSupplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { name, portalUrl, portalUser, portalPass, observations }
    });
    res.json(updatedSupplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Force restart for portal changes
