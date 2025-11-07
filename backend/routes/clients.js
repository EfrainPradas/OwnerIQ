const PERSON_ROLE_KIND = Object.freeze({
  TENANT: 'tenant',
  LENDER: 'lender',
  INVESTOR_CONTACT: 'investor_contact',
  ADVISOR: 'advisor'
});

const ACTIVE_TENANCY_STATUSES = new Set(['active', 'delinquent']);

const TENANCY_DEFAULT_STATUS = 'active';

function isDemoUser(userId) {
  return userId === 'dummy-id';
}

function deriveFullName(payload = {}) {
  const legalType = payload.legal_type || 'individual';
  if (legalType === 'organization') {
    return (
      payload.company_name ||
      payload.preferred_name ||
      payload.full_name ||
      [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() ||
      'Organization'
    );
  }

  const first = payload.preferred_name || payload.first_name;
  const parts = [first, payload.last_name]
    .filter(part => part && String(part).trim().length)
    .map(part => String(part).trim());

  if (parts.length) {
    return parts.join(' ');
  }

  return payload.company_name || payload.full_name || 'Individual';
}

function parseNotesPayload(notes) {
  if (!notes) {
    return {};
  }
  if (typeof notes === 'string') {
    return { text: notes };
  }
  if (typeof notes === 'object' && !Array.isArray(notes)) {
    return notes;
  }
  return {};
}

function groupBy(rows = [], key) {
  const map = new Map();
  rows.forEach(row => {
    if (!row || row[key] === undefined || row[key] === null) return;
    const bucketKey = row[key];
    if (!map.has(bucketKey)) {
      map.set(bucketKey, []);
    }
    map.get(bucketKey).push(row);
  });
  return map;
}

async function fetchPropertiesForOwner(supabase, ownerId) {
  let query = supabase
    .from('property')
    .select('*'); // Return ALL fields including mortgage data

  if (!isDemoUser(ownerId)) {
    query = query.eq('person_id', ownerId);
  }

  return query;
}

function sanitizeContactsInput(contacts = []) {
  return contacts
    .filter(contact => contact && contact.value)
    .map(contact => ({
      person_id: contact.person_id || null,
      kind: contact.kind || 'email',
      value: String(contact.value).trim(),
      label: contact.label || null,
      is_primary: Boolean(contact.is_primary),
      verification_status: contact.verification_status || 'pending',
      metadata: contact.metadata || {}
    }));
}

function sanitizeAddressesInput(addresses = []) {
  const now = new Date().toISOString().split('T')[0];
  return addresses
    .filter(address => address && address.line1)
    .map(address => ({
      person_id: address.person_id || null,
      kind: address.kind || 'home',
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city || null,
      state_code: address.state_code || address.state || null,
      postal_code: address.postal_code || address.zip_code || null,
      country_code: address.country_code || 'US',
      is_primary: Boolean(address.is_primary),
      valid_from: address.valid_from || now,
      valid_to: address.valid_to || null,
      verification_status: address.verification_status || 'pending',
      metadata: address.metadata || {}
    }));
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sanitizeTenancyForWrite(tenancy, personId) {
  return {
    tenancy_id: tenancy.tenancy_id || undefined,
    person_id: personId || tenancy.person_id || null,
    property_id: tenancy.property_id,
    lease_start: tenancy.lease_start || null,
    lease_end: tenancy.lease_end || null,
    rent_amount: parseNumeric(tenancy.rent_amount),
    status: tenancy.status || TENANCY_DEFAULT_STATUS,
    source: tenancy.source || 'manual'
  };
}

function sanitizeTenanciesInput(tenancies = [], personId) {
  return tenancies
    .filter(tenancy => tenancy && tenancy.property_id)
    .map(tenancy => sanitizeTenancyForWrite(tenancy, personId));
}

function derivePrimaryContacts(contacts = []) {
  const normalized = contacts.map(contact => ({
    ...contact,
    kind: (contact.kind || '').toLowerCase()
  }));

  const primaryEmail = normalized.find(contact => contact.kind === 'email' && contact.is_primary);
  const anyEmail = normalized.find(contact => contact.kind === 'email');

  const phoneKinds = new Set(['phone', 'mobile', 'whatsapp']);
  const primaryPhone = normalized.find(contact => phoneKinds.has(contact.kind) && contact.is_primary);
  const anyPhone = normalized.find(contact => phoneKinds.has(contact.kind));

  return {
    email: (primaryEmail || anyEmail)?.value || null,
    phone: (primaryPhone || anyPhone)?.value || null
  };
}

async function fetchGroupedByPerson(supabase, table, personIds) {
  if (!personIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .in('person_id', personIds);

  if (error) {
    throw error;
  }

  return groupBy(data || [], 'person_id');
}

async function loadPersonsWithDetails(supabase, personIds = []) {
  const unique = Array.from(new Set(personIds.filter(Boolean)));
  if (!unique.length) {
    return [];
  }

  const { data: personRows, error: personError } = await supabase
    .from('person')
    .select('person_id, legal_type, status, first_name, last_name, preferred_name, company_name, full_name, primary_email, primary_phone, source, notes, created_at, updated_at, created_by')
    .in('person_id', unique);

  if (personError) {
    throw personError;
  }

  const contactMap = await fetchGroupedByPerson(supabase, 'person_contact', unique);
  const addressMap = await fetchGroupedByPerson(supabase, 'person_address', unique);

  let roleMap = new Map();
  try {
    roleMap = await fetchGroupedByPerson(supabase, 'person_role', unique);
  } catch (error) {
    if (error.code !== '42P01') {
      throw error;
    }
  }

  return (personRows || []).map(person => ({
    ...person,
    notes: person.notes || {},
    contacts: contactMap.get(person.person_id) || [],
    addresses: addressMap.get(person.person_id) || [],
    roles: roleMap.get(person.person_id) || []
  }));
}

async function loadTenants(supabase, ownerId, options = {}) {
  const propertiesResult = await fetchPropertiesForOwner(supabase, ownerId);
  if (propertiesResult.error) {
    throw propertiesResult.error;
  }

  const propertyRows = propertiesResult.data || [];
  const propertyIds = propertyRows.map(row => row.property_id);

  const requestedPersonIds = Array.isArray(options.personIds)
    ? options.personIds.filter(Boolean)
    : [];

  // Get all person IDs with tenant role
  let roleQuery = supabase
    .from('person_role')
    .select('person_id')
    .eq('role', PERSON_ROLE_KIND.TENANT);

  if (!isDemoUser(ownerId)) {
    roleQuery = roleQuery.eq('owner_person_id', ownerId);
  }

  if (requestedPersonIds.length) {
    roleQuery = roleQuery.in('person_id', requestedPersonIds);
  }

  const { data: roleRows, error: roleError } = await roleQuery;
  if (roleError) {
    throw roleError;
  }

  const personIdSet = new Set(requestedPersonIds);
  (roleRows || []).forEach(row => {
    if (row.person_id) {
      personIdSet.add(row.person_id);
    }
  });

  // Get tenancies for these properties
  let tenancyRows = [];
  if (propertyIds.length) {
    let tenancyQuery = supabase
      .from('property_tenancy')
      .select('tenancy_id, person_id, property_id, lease_start, lease_end, rent_amount, status, source, created_at, updated_at')
      .in('property_id', propertyIds);

    if (requestedPersonIds.length) {
      tenancyQuery = tenancyQuery.in('person_id', requestedPersonIds);
    }

    const { data, error } = await tenancyQuery;
    if (error) {
      throw error;
    }
    tenancyRows = data || [];
    
    // Add person IDs from tenancies
    tenancyRows.forEach(row => {
      if (row.person_id) {
        personIdSet.add(row.person_id);
      }
    });
  }

  const personIds = Array.from(personIdSet);
  if (!personIds.length) {
    return [];
  }

  const persons = await loadPersonsWithDetails(supabase, personIds);
  const tenancyMap = groupBy(tenancyRows, 'person_id');
  const propertyMap = new Map(propertyRows.map(row => [row.property_id, row]));

  return persons.map(person => {
    const rows = tenancyMap.get(person.person_id) || [];
    const enriched = rows.map(row => ({
      ...row,
      rent_amount: parseNumeric(row.rent_amount),
      property: propertyMap.get(row.property_id) || null
    }));
    return {
      ...person,
      tenancies: enriched
    };
  });
}

async function loadLenders(supabase, ownerId, options = {}) {
  const requestedPersonIds = Array.isArray(options.personIds)
    ? options.personIds.filter(Boolean)
    : [];

  let roleQuery = supabase
    .from('person_role')
    .select('person_role_id, person_id, owner_person_id, role, context, context_id, active_from, active_to, created_at')
    .eq('role', PERSON_ROLE_KIND.LENDER);

  if (!isDemoUser(ownerId)) {
    roleQuery = roleQuery.eq('owner_person_id', ownerId);
  }

  if (requestedPersonIds.length) {
    roleQuery = roleQuery.in('person_id', requestedPersonIds);
  }

  const { data: roleRows, error: roleError } = await roleQuery;
  if (roleError) {
    throw roleError;
  }

  const personIds = Array.from(new Set((roleRows || []).map(row => row.person_id).filter(Boolean)));
  if (!personIds.length) {
    return [];
  }

  const persons = await loadPersonsWithDetails(supabase, personIds);
  const roleMap = groupBy(roleRows, 'person_id');

  return persons.map(person => ({
    ...person,
    roles: roleMap.get(person.person_id) || []
  }));
}

async function ensurePropertiesBelongToOwner(supabase, ownerId, propertyIds) {
  const unique = Array.from(new Set((propertyIds || []).filter(Boolean)));
  if (!unique.length) {
    return { ok: true, rows: [] };
  }

  let query = supabase
    .from('property')
    .select('property_id, person_id')
    .in('property_id', unique);

  const { data, error } = await query;
  if (error) {
    return { ok: false, error };
  }

  if ((data || []).length !== unique.length) {
    const foundIds = new Set((data || []).map(row => row.property_id));
    const missing = unique.filter(id => !foundIds.has(id));
    return {
      ok: false,
      status: 400,
      message: `Unknown property identifiers: ${missing.join(', ')}`
    };
  }

  if (isDemoUser(ownerId)) {
    return { ok: true, rows: data || [] };
  }

  const unauthorized = (data || []).filter(row => row.person_id !== ownerId);
  if (unauthorized.length) {
    return {
      ok: false,
      status: 403,
      message: 'One or more properties cannot be managed by this account',
      unauthorizedPropertyIds: unauthorized.map(row => row.property_id)
    };
  }

  return { ok: true, rows: data || [] };
}

async function ensureTenanciesBelongToOwner(supabase, ownerId, tenancyIds) {
  const unique = Array.from(new Set((tenancyIds || []).filter(Boolean)));
  if (!unique.length) {
    return { ok: true, rows: [] };
  }

  const { data, error } = await supabase
    .from('property_tenancy')
    .select('tenancy_id, property_id, person_id')
    .in('tenancy_id', unique);

  if (error) {
    return { ok: false, error };
  }

  if ((data || []).length !== unique.length) {
    return {
      ok: false,
      status: 404,
      message: 'One or more tenancy records were not found'
    };
  }

  if (isDemoUser(ownerId)) {
    return { ok: true, rows: data || [] };
  }

  const propertyIds = Array.from(new Set((data || []).map(row => row.property_id)));
  const { data: propertyRows, error: propertyError } = await supabase
    .from('property')
    .select('property_id, person_id')
    .in('property_id', propertyIds);

  if (propertyError) {
    return { ok: false, error: propertyError };
  }

  const propertyOwnerMap = new Map((propertyRows || []).map(row => [row.property_id, row.person_id]));
  const unauthorized = (data || []).filter(row => propertyOwnerMap.get(row.property_id) !== ownerId);

  if (unauthorized.length) {
    return {
      ok: false,
      status: 403,
      message: 'Tenancy record does not belong to one of your properties'
    };
  }

  return { ok: true, rows: data || [] };
}

async function ensureTenantAccessible(supabase, personId, ownerId) {
  if (isDemoUser(ownerId)) {
    return { ok: true };
  }

  const { data: tenancyRows, error: tenancyError } = await supabase
    .from('property_tenancy')
    .select('tenancy_id')
    .eq('person_id', personId);

  if (tenancyError) {
    return { ok: false, error: tenancyError };
  }

  if ((tenancyRows || []).length) {
    const check = await ensureTenanciesBelongToOwner(
      supabase,
      ownerId,
      tenancyRows.map(row => row.tenancy_id)
    );
    if (check.ok) {
      return { ok: true };
    }
    if (check.status && check.status !== 404) {
      return check;
    }
  }

  const { data: roleRows, error: roleError } = await supabase
    .from('person_role')
    .select('person_role_id')
    .eq('person_id', personId)
    .eq('owner_person_id', ownerId)
    .eq('role', PERSON_ROLE_KIND.TENANT)
    .limit(1);

  if (roleError) {
    return { ok: false, error: roleError };
  }

  if (roleRows && roleRows.length) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 404,
    message: 'Tenant not found for your portfolio'
  };
}

async function ensureLenderAccessible(supabase, personId, ownerId) {
  if (isDemoUser(ownerId)) {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from('person_role')
    .select('person_role_id')
    .eq('person_id', personId)
    .eq('owner_person_id', ownerId)
    .eq('role', PERSON_ROLE_KIND.LENDER)
    .limit(1);

  if (error) {
    return { ok: false, error };
  }

  if (data && data.length) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 404,
    message: 'Lender not found for your portfolio'
  };
}

async function safeDeleteFromTable(supabase, table, personId) {
  const { error } = await supabase.from(table).delete().eq('person_id', personId);
  if (error && error.code !== '42P01') {
    throw error;
  }
}

async function deletePersonIfOrphan(supabase, personId) {
  const { data: remainingRoles, error: rolesError } = await supabase
    .from('person_role')
    .select('person_role_id')
    .eq('person_id', personId)
    .limit(1);

  if (rolesError && rolesError.code !== '42P01') {
    throw rolesError;
  }

  if (remainingRoles && remainingRoles.length) {
    return false;
  }

  await safeDeleteFromTable(supabase, 'person_contact', personId);
  await safeDeleteFromTable(supabase, 'person_address', personId);
  await safeDeleteFromTable(supabase, 'person_document', personId);

  const { error: deleteError } = await supabase.from('person').delete().eq('person_id', personId);
  if (deleteError) {
    throw deleteError;
  }

  return true;
}

function buildPersonInsert(payload = {}, options = {}) {
  const base = {
    legal_type: payload.legal_type || 'individual',
    first_name: payload.first_name || null,
    last_name: payload.last_name || null,
    preferred_name: payload.preferred_name || null,
    company_name: payload.company_name || null,
    status: payload.status || 'active',
    source: payload.source || null,
    notes: parseNotesPayload(payload.notes),
    primary_email: options.primaryEmail || payload.primary_email || null,
    primary_phone: options.primaryPhone || payload.primary_phone || null,
    created_by: options.ownerId || null
  };

  return {
    ...base,
    full_name: deriveFullName(base)
  };
}

function buildPersonUpdate(assignments = {}, current = {}, options = {}) {
  const merged = {
    ...current,
    ...assignments
  };

  if (options.primaryEmail !== undefined) {
    merged.primary_email = options.primaryEmail;
  }
  if (options.primaryPhone !== undefined) {
    merged.primary_phone = options.primaryPhone;
  }

  const update = {
    legal_type: merged.legal_type || current.legal_type || 'individual',
    first_name: merged.first_name || null,
    last_name: merged.last_name || null,
    preferred_name: merged.preferred_name || null,
    company_name: merged.company_name || null,
    status: merged.status || 'active',
    source: merged.source || null,
    notes: parseNotesPayload(merged.notes),
    primary_email: merged.primary_email || null,
    primary_phone: merged.primary_phone || null,
    full_name: deriveFullName(merged),
    updated_at: new Date().toISOString()
  };

  return update;
}

async function replaceContacts(supabase, personId, contacts) {
  const sanitized = sanitizeContactsInput(contacts).map(contact => ({
    ...contact,
    person_id: personId
  }));

  const { error: deleteError } = await supabase.from('person_contact').delete().eq('person_id', personId);
  if (deleteError && deleteError.code !== '42P01') {
    throw deleteError;
  }

  if (!sanitized.length) {
    return;
  }

  const { error: insertError } = await supabase.from('person_contact').insert(sanitized);
  if (insertError) {
    throw insertError;
  }
}

async function replaceAddresses(supabase, personId, addresses) {
  const sanitized = sanitizeAddressesInput(addresses).map(address => ({
    ...address,
    person_id: personId
  }));

  const { error: deleteError } = await supabase.from('person_address').delete().eq('person_id', personId);
  if (deleteError && deleteError.code !== '42P01') {
    throw deleteError;
  }

  if (!sanitized.length) {
    return;
  }

  const { error: insertError } = await supabase.from('person_address').insert(sanitized);
  if (insertError) {
    throw insertError;
  }
}

function isTenancyActive(tenancy) {
  if (!tenancy) {
    return false;
  }
  const status = tenancy.status || TENANCY_DEFAULT_STATUS;
  if (!ACTIVE_TENANCY_STATUSES.has(status)) {
    return false;
  }
  if (!tenancy.lease_end) {
    return true;
  }
  return new Date(tenancy.lease_end) >= new Date();
}

async function fetchAvailablePropertiesForOwner(supabase, ownerId) {
  const propertiesResult = await fetchPropertiesForOwner(supabase, ownerId);
  if (propertiesResult.error) {
    throw propertiesResult.error;
  }

  const propertyRows = propertiesResult.data || [];
  if (!propertyRows.length) {
    return [];
  }

  const propertyIds = propertyRows.map(row => row.property_id);
  const { data: tenancyRows, error: tenancyError } = await supabase
    .from('property_tenancy')
    .select('property_id, lease_end, status')
    .in('property_id', propertyIds);

  if (tenancyError) {
    throw tenancyError;
  }

  const occupied = new Set();
  (tenancyRows || []).forEach(tenancy => {
    if (isTenancyActive(tenancy)) {
      occupied.add(tenancy.property_id);
    }
  });

  return propertyRows.filter(row => !occupied.has(row.property_id));
}

function registerClientRoutes(app, supabase, authenticateToken) {
  const requireAuth = authenticateToken(supabase);

  console.log('Setting up leases invoices endpoint...');
  
  // Leases routes - MUST be before other routes to avoid conflicts
  app.get('/api/leases/:id/invoices', requireAuth, async (req, res) => {
    console.log('🚀 Leases invoices endpoint called with params:', req.params);
    const ownerId = req.user.id;
    const { id } = req.params;

    console.log(`🔍 Fetching invoices for lease ${id}, user ${ownerId}`);

    try {
      // Security check: ensure the lease belongs to the owner.
      const { data: lease, error: leaseError } = await supabase.from('lease').select('property_id').eq('lease_id', id).single();
      console.log('Lease lookup result:', { lease, leaseError });

      if (leaseError || !lease) {
        console.log(`Lease ${id} not found`);
        return res.status(404).json({ error: 'Lease not found' });
      }

      // Check if user owns the property (unless dummy-id)
      if (ownerId !== 'dummy-id') {
        const { data: propertyData, error: propertyError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', lease.property_id)
          .single();

        if (propertyError || !propertyData || propertyData.person_id !== ownerId) {
          console.log(`Access denied for lease ${id}: property not owned by user`);
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Fetch invoices from rent_invoice table
      const { data, error } = await supabase
        .from('rent_invoice')
        .select('invoice_id, invoice_number, amount_due, due_date, status')
        .eq('lease_id', id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      console.log(`Returning ${data?.length || 0} invoices for lease ${id}`);
      res.json(data || []);
    } catch (error) {
      console.error(`Failed to load invoices for lease ${id}:`, error);
      res.status(500).json({ error: 'Failed to load invoices', details: error.message });
    }
  });

  app.get('/api/clients/tenants', requireAuth, async (req, res) => {
    try {
      const ownerId = req.user.id;
      console.log('Loading tenants for owner:', ownerId);
      const tenants = await loadTenants(supabase, ownerId);
      console.log('Tenants loaded successfully:', tenants.length);
      res.json(tenants);
    } catch (error) {
      console.error('Failed to load tenants - Full error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      res.status(500).json({
        error: 'Failed to load tenants',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }
  });

  app.post('/api/clients/tenants', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const isDemo = isDemoUser(ownerId);

    const {
      person: personPayload = {},
      contacts = [],
      addresses = [],
      tenancies = []
    } = req.body || {};

    try {
      const sanitizedContacts = sanitizeContactsInput(contacts);
      const sanitizedAddresses = sanitizeAddressesInput(addresses);
      const sanitizedTenancies = sanitizeTenanciesInput(tenancies);

      const propertyIds = sanitizedTenancies.map(tenancy => tenancy.property_id);
      const propertyCheck = await ensurePropertiesBelongToOwner(supabase, ownerId, propertyIds);
      if (!propertyCheck.ok) {
        const status = propertyCheck.status || 400;
        return res.status(status).json({
          error: propertyCheck.message || propertyCheck.error?.message || 'Invalid property selection'
        });
      }

      const primary = derivePrimaryContacts(sanitizedContacts);
      const personInsert = buildPersonInsert(personPayload, {
        primaryEmail: primary.email,
        primaryPhone: primary.phone,
        ownerId: isDemo ? null : ownerId
      });

      const { data: personRow, error: personError } = await supabase
        .from('person')
        .insert(personInsert)
        .select()
        .single();

      if (personError) {
        console.error('Create tenant: person insert failed', JSON.stringify(personError, null, 2));
        
        // Handle duplicate email error
        if (personError.code === '23505' && personError.message.includes('primary_email')) {
          return res.status(400).json({
            error: 'A person with this email already exists. Please use a different email address.'
          });
        }
        
        return res.status(400).json({ error: personError.message });
      }

      const personId = personRow.person_id;

      try {
        await replaceContacts(supabase, personId, sanitizedContacts);
        await replaceAddresses(supabase, personId, sanitizedAddresses);
      } catch (contactError) {
        console.error('Create tenant: contact/address sync failed', JSON.stringify(contactError, null, 2));
        return res.status(400).json({ error: contactError.message });
      }

      const roleInsert = {
        person_id: personId,
        owner_person_id: isDemo ? null : ownerId,
        role: PERSON_ROLE_KIND.TENANT,
        context: 'property',
        context_id: null,
        active_from: new Date().toISOString().slice(0, 10)
      };

      const { error: roleError } = await supabase.from('person_role').insert(roleInsert);
      if (roleError && roleError.code !== '23505') {
        console.error('Create tenant: role insert failed', JSON.stringify(roleError, null, 2));
        return res.status(400).json({ error: roleError.message });
      }

      if (sanitizedTenancies.length) {
        const tenanciesToInsert = sanitizedTenancies.map(({ tenancy_id, ...rest }) => ({
          ...rest,
          person_id: personId
        }));

        const { error: tenancyError } = await supabase.from('property_tenancy').insert(tenanciesToInsert);
        if (tenancyError) {
        console.error('Create tenant: tenancy insert failed', JSON.stringify(tenancyError, null, 2));
          return res.status(400).json({ error: tenancyError.message });
        }
      }

      const tenants = await loadTenants(supabase, ownerId, { personIds: [personId] });
      res.status(201).json(tenants[0] || null);
    } catch (error) {
      console.error('Create tenant: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to create tenant', details: error.message });
    }
  });

  app.put('/api/clients/tenants/:personId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const personId = req.params.personId;

    const accessibility = await ensureTenantAccessible(supabase, personId, ownerId);
    if (!accessibility.ok) {
      if (accessibility.error) {
        console.error('Update tenant: accessibility error', JSON.stringify(accessibility.error, null, 2));
        return res.status(500).json({ error: 'Unable to validate tenant access', details: accessibility.error.message });
      }
      return res.status(accessibility.status || 404).json({ error: accessibility.message || 'Tenant not found' });
    }

    const {
      person: personPayload = {},
      contacts = [],
      addresses = [],
      tenancies = [],
      removeTenancyIds = []
    } = req.body || {};

    try {
      const { data: existingPerson, error: existingError } = await supabase
        .from('person')
        .select('*')
        .eq('person_id', personId)
        .single();

      if (existingError) {
        console.error('Update tenant: load existing failed', JSON.stringify(existingError, null, 2));
        return res.status(404).json({ error: 'Tenant person record not found' });
      }

      const sanitizedContacts = sanitizeContactsInput(contacts);
      const sanitizedAddresses = sanitizeAddressesInput(addresses);
      const sanitizedTenancies = sanitizeTenanciesInput(tenancies, personId);
      const primary = derivePrimaryContacts(sanitizedContacts);

      const propertyIds = sanitizedTenancies.map(tenancy => tenancy.property_id);
      const propertyCheck = await ensurePropertiesBelongToOwner(supabase, ownerId, propertyIds);
      if (!propertyCheck.ok) {
        const status = propertyCheck.status || 400;
        return res.status(status).json({
          error: propertyCheck.message || propertyCheck.error?.message || 'Invalid property selection'
        });
      }

      const tenancyIdsToRemove = Array.isArray(removeTenancyIds)
        ? removeTenancyIds.filter(Boolean)
        : [];

      const existingTenancyIds = sanitizedTenancies
        .filter(tenancy => tenancy.tenancy_id)
        .map(tenancy => tenancy.tenancy_id);

      const tenancyOwnershipCheck = await ensureTenanciesBelongToOwner(
        supabase,
        ownerId,
        [...tenancyIdsToRemove, ...existingTenancyIds]
      );

      if (!tenancyOwnershipCheck.ok) {
        const status = tenancyOwnershipCheck.status || 400;
        return res.status(status).json({
          error: tenancyOwnershipCheck.message || tenancyOwnershipCheck.error?.message || 'Invalid tenancy selection'
        });
      }

      const personUpdate = buildPersonUpdate(personPayload, existingPerson, {
        primaryEmail: primary.email,
        primaryPhone: primary.phone
      });

      const { error: updateError } = await supabase
        .from('person')
        .update(personUpdate)
        .eq('person_id', personId);

      if (updateError) {
        console.error('Update tenant: person update failed', JSON.stringify(updateError, null, 2));
        return res.status(400).json({ error: updateError.message });
      }

      try {
        await replaceContacts(supabase, personId, sanitizedContacts);
        await replaceAddresses(supabase, personId, sanitizedAddresses);
      } catch (contactError) {
        console.error('Update tenant: contact/address sync failed', JSON.stringify(contactError, null, 2));
        return res.status(400).json({ error: contactError.message });
      }

      if (tenancyIdsToRemove.length) {
        try {
          const { error: partyDeleteError } = await supabase
            .from('property_tenancy_party')
            .delete()
            .in('tenancy_id', tenancyIdsToRemove);
          if (partyDeleteError && partyDeleteError.code !== '42P01') {
            throw partyDeleteError;
          }
        } catch (partyError) {
          if (partyError.code !== '42P01') {
            console.error('Update tenant: tenancy party delete failed', JSON.stringify(partyError, null, 2));
            return res.status(400).json({ error: partyError.message || 'Unable to modify tenancy parties' });
          }
        }

        const { error: tenancyDeleteError } = await supabase
          .from('property_tenancy')
          .delete()
          .in('tenancy_id', tenancyIdsToRemove);

        if (tenancyDeleteError) {
          console.error('Update tenant: tenancy delete failed', JSON.stringify(tenancyDeleteError, null, 2));
          return res.status(400).json({ error: tenancyDeleteError.message });
        }
      }

      for (const tenancy of sanitizedTenancies) {
        if (tenancy.tenancy_id) {
          const { tenancy_id, ...updates } = tenancy;
          const { error: tenancyUpdateError } = await supabase
            .from('property_tenancy')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('tenancy_id', tenancy_id)
            .eq('person_id', personId);

          if (tenancyUpdateError) {
            console.error('Update tenant: tenancy update failed', JSON.stringify(tenancyUpdateError, null, 2));
            return res.status(400).json({ error: tenancyUpdateError.message });
          }
        } else {
          const { tenancy_id, person_id, ...rest } = tenancy;
          const payload = {
            ...rest,
            person_id: personId
          };
          const { error: tenancyInsertError } = await supabase.from('property_tenancy').insert(payload);
          if (tenancyInsertError) {
            console.error('Update tenant: tenancy insert failed', JSON.stringify(tenancyInsertError, null, 2));
            return res.status(400).json({ error: tenancyInsertError.message });
          }
        }
      }

      const tenants = await loadTenants(supabase, ownerId, { personIds: [personId] });
      res.json(tenants[0] || null);
    } catch (error) {
      console.error('Update tenant: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to update tenant', details: error.message });
    }
  });

  app.delete('/api/clients/tenants/:personId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const personId = req.params.personId;

    const accessibility = await ensureTenantAccessible(supabase, personId, ownerId);
    if (!accessibility.ok) {
      if (accessibility.error) {
        console.error('Delete tenant: accessibility error', JSON.stringify(accessibility.error, null, 2));
        return res.status(500).json({ error: 'Unable to validate tenant access', details: accessibility.error.message });
      }
      return res.status(accessibility.status || 404).json({ error: accessibility.message || 'Tenant not found' });
    }

    try {
      const propertiesResult = await fetchPropertiesForOwner(supabase, ownerId);
      if (propertiesResult.error) {
        throw propertiesResult.error;
      }
      const propertyIds = (propertiesResult.data || []).map(row => row.property_id);

      if (propertyIds.length) {
        const { data: tenancyRows, error: tenancyError } = await supabase
          .from('property_tenancy')
          .select('tenancy_id')
          .eq('person_id', personId)
          .in('property_id', propertyIds);

        if (tenancyError) {
          throw tenancyError;
        }

        const tenancyIds = (tenancyRows || []).map(row => row.tenancy_id);
        if (tenancyIds.length) {
          try {
            const { error: partyDeleteError } = await supabase
              .from('property_tenancy_party')
              .delete()
              .in('tenancy_id', tenancyIds);
            if (partyDeleteError && partyDeleteError.code !== '42P01') {
              throw partyDeleteError;
            }
          } catch (partyError) {
            if (partyError.code !== '42P01') {
              console.error('Delete tenant: tenancy party delete failed', JSON.stringify(partyError, null, 2));
              return res.status(400).json({ error: partyError.message || 'Unable to remove tenancy parties' });
            }
          }

          const { error: tenancyDeleteError } = await supabase
            .from('property_tenancy')
            .delete()
            .in('tenancy_id', tenancyIds);

          if (tenancyDeleteError) {
            throw tenancyDeleteError;
          }
        }
      }

      const { error: roleDeleteError } = await supabase
        .from('person_role')
        .delete()
        .eq('person_id', personId)
        .eq('role', PERSON_ROLE_KIND.TENANT)
        .eq('owner_person_id', isDemoUser(ownerId) ? null : ownerId);

      if (roleDeleteError) {
        throw roleDeleteError;
      }

      const removed = await deletePersonIfOrphan(supabase, personId);
      res.json({
        message: removed ? 'Tenant and person record removed' : 'Tenant role removed'
      });
    } catch (error) {
      console.error('Delete tenant: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to delete tenant', details: error.message });
    }
  });

  app.get('/api/clients/lenders', requireAuth, async (req, res) => {
    try {
      const ownerId = req.user.id;
      const lenders = await loadLenders(supabase, ownerId);
      res.json(lenders);
    } catch (error) {
      console.error('Failed to load lenders', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Failed to load lenders', details: error.message });
    }
  });

  app.post('/api/clients/lenders', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const isDemo = isDemoUser(ownerId);

    const {
      person: personPayload = {},
      contacts = [],
      addresses = []
    } = req.body || {};

    try {
      const sanitizedContacts = sanitizeContactsInput(contacts);
      const sanitizedAddresses = sanitizeAddressesInput(addresses);
      const primary = derivePrimaryContacts(sanitizedContacts);

      const personInsert = buildPersonInsert(personPayload, {
        primaryEmail: primary.email,
        primaryPhone: primary.phone,
        ownerId: isDemo ? null : ownerId
      });

      const { data: personRow, error: personError } = await supabase
        .from('person')
        .insert(personInsert)
        .select()
        .single();

      if (personError) {
        console.error('Create lender: person insert failed', JSON.stringify(personError, null, 2));
        return res.status(400).json({ error: personError.message });
      }

      const personId = personRow.person_id;

      try {
        await replaceContacts(supabase, personId, sanitizedContacts);
        await replaceAddresses(supabase, personId, sanitizedAddresses);
      } catch (contactError) {
        console.error('Create lender: contact/address sync failed', JSON.stringify(contactError, null, 2));
        return res.status(400).json({ error: contactError.message });
      }

      const roleInsert = {
        person_id: personId,
        owner_person_id: isDemo ? null : ownerId,
        role: PERSON_ROLE_KIND.LENDER,
        context: 'portfolio',
        context_id: null,
        active_from: new Date().toISOString().slice(0, 10)
      };

      const { error: roleError } = await supabase.from('person_role').insert(roleInsert);
      if (roleError && roleError.code !== '23505') {
        console.error('Create lender: role insert failed', JSON.stringify(roleError, null, 2));
        return res.status(400).json({ error: roleError.message });
      }

      const lenders = await loadLenders(supabase, ownerId, { personIds: [personId] });
      res.status(201).json(lenders[0] || null);
    } catch (error) {
      console.error('Create lender: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to create lender', details: error.message });
    }
  });

  app.put('/api/clients/lenders/:personId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const personId = req.params.personId;

    const accessibility = await ensureLenderAccessible(supabase, personId, ownerId);
    if (!accessibility.ok) {
      if (accessibility.error) {
        console.error('Update lender: accessibility error', JSON.stringify(accessibility.error, null, 2));
        return res.status(500).json({ error: 'Unable to validate lender access', details: accessibility.error.message });
      }
      return res.status(accessibility.status || 404).json({ error: accessibility.message || 'Lender not found' });
    }

    const {
      person: personPayload = {},
      contacts = [],
      addresses = []
    } = req.body || {};

    try {
      const { data: existingPerson, error: existingError } = await supabase
        .from('person')
        .select('*')
        .eq('person_id', personId)
        .single();

      if (existingError) {
        console.error('Update lender: load existing failed', JSON.stringify(existingError, null, 2));
        return res.status(404).json({ error: 'Lender person record not found' });
      }

      const sanitizedContacts = sanitizeContactsInput(contacts);
      const sanitizedAddresses = sanitizeAddressesInput(addresses);
      const primary = derivePrimaryContacts(sanitizedContacts);

      const personUpdate = buildPersonUpdate(personPayload, existingPerson, {
        primaryEmail: primary.email,
        primaryPhone: primary.phone
      });

      const { error: updateError } = await supabase
        .from('person')
        .update(personUpdate)
        .eq('person_id', personId);

      if (updateError) {
        console.error('Update lender: person update failed', JSON.stringify(updateError, null, 2));
        return res.status(400).json({ error: updateError.message });
      }

      try {
        await replaceContacts(supabase, personId, sanitizedContacts);
        await replaceAddresses(supabase, personId, sanitizedAddresses);
      } catch (contactError) {
        console.error('Update lender: contact/address sync failed', JSON.stringify(contactError, null, 2));
        return res.status(400).json({ error: contactError.message });
      }

      const lenders = await loadLenders(supabase, ownerId, { personIds: [personId] });
      res.json(lenders[0] || null);
    } catch (error) {
      console.error('Update lender: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to update lender', details: error.message });
    }
  });

  app.delete('/api/clients/lenders/:personId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const personId = req.params.personId;

    const accessibility = await ensureLenderAccessible(supabase, personId, ownerId);
    if (!accessibility.ok) {
      if (accessibility.error) {
        console.error('Delete lender: accessibility error', JSON.stringify(accessibility.error, null, 2));
        return res.status(500).json({ error: 'Unable to validate lender access', details: accessibility.error.message });
      }
      return res.status(accessibility.status || 404).json({ error: accessibility.message || 'Lender not found' });
    }

    try {
      const { error: roleDeleteError } = await supabase
        .from('person_role')
        .delete()
        .eq('person_id', personId)
        .eq('role', PERSON_ROLE_KIND.LENDER)
        .eq('owner_person_id', isDemoUser(ownerId) ? null : ownerId);

      if (roleDeleteError) {
        throw roleDeleteError;
      }

      const removed = await deletePersonIfOrphan(supabase, personId);
      res.json({
        message: removed ? 'Lender and person record removed' : 'Lender role removed'
      });
    } catch (error) {
      console.error('Delete lender: unexpected failure', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Unable to delete lender', details: error.message });
    }
  });

  app.post('/api/properties', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const isDemo = isDemoUser(ownerId);

    const payload = req.body || {};
    console.log('Creating property for owner:', ownerId, 'Payload keys:', Object.keys(payload));

    try {
      // Map frontend field names to database column names
      const propertyData = {
        person_id: isDemo ? null : ownerId,
        address: payload.address || null,
        city: payload.city || null,
        state: payload.state || null,
        zip_code: payload.zipCode || null,
        property_type: payload.propertyType || null,
        valuation: parseNumeric(payload.valuation),
        purchase_price: parseNumeric(payload.purchasePrice),
        refinance_price: parseNumeric(payload.refinancePrice),
        purchase_refinance_closing_date: payload.purchaseRefinanceClosingDate || null,
        rent: parseNumeric(payload.rent),
        gross_monthly_income_rent: parseNumeric(payload.grossMonthlyIncomeRent),
        property_management_percentage: parseNumeric(payload.propertyManagementPercentage),
        property_management_amount: parseNumeric(payload.propertyManagementAmount),
        net_monthly_income: parseNumeric(payload.netMonthlyIncome),
        taxes: parseNumeric(payload.taxes),
        insurance: parseNumeric(payload.insurance),
        hoa: parseNumeric(payload.hoa),
        maintenance: parseNumeric(payload.maintenance),
        vacancy: parseNumeric(payload.vacancy),
        loan_rate: parseNumeric(payload.loanRate),
        loan_term: parseNumeric(payload.loanTerm),
        loan_amount: parseNumeric(payload.loanAmount),
        loan_number: payload.loanNumber || null,
        monthly_payment_principal_interest: parseNumeric(payload.monthlyPaymentPrincipalInterest),
        escrow_property_tax: parseNumeric(payload.escrowPropertyTax),
        escrow_home_owner_insurance: parseNumeric(payload.escrowHomeOwnerInsurance),
        total_monthly_payment_piti: parseNumeric(payload.totalMonthlyPaymentPiti),
        home_owner_insurance_initial_escrow: parseNumeric(payload.homeOwnerInsuranceInitialEscrow),
        property_taxes_initial_escrow: parseNumeric(payload.propertyTaxesInitialEscrow),
        first_payment_date: payload.firstPaymentDate || null,
        pre_payment_penalty: payload.prePaymentPenalty || null,
        monthly_payment: parseNumeric(payload.monthlyPayment),
        interest_rate: parseNumeric(payload.interestRate),
        term_years: parseNumeric(payload.termYears),
        ltv: parseNumeric(payload.ltv),
        down_payment: parseNumeric(payload.downPayment),
        year_1: parseNumeric(payload.year1),
        year_2: parseNumeric(payload.year2),
        year_3: parseNumeric(payload.year3),
        year_4: parseNumeric(payload.year4),
        year_5: parseNumeric(payload.year5),
        property_tax_county: payload.propertyTaxCounty || null,
        tax_authority: payload.taxAuthority || null,
        tax_authority_web_page: payload.taxAuthorityWebPage || null,
        account_number: payload.accountNumber || null,
        assessed_value: parseNumeric(payload.assessedValue),
        taxes_paid_last_year: parseNumeric(payload.taxesPaidLastYear),
        property_tax_percentage: parseNumeric(payload.propertyTaxPercentage),
        insurance_initial_premium: parseNumeric(payload.insuranceInitialPremium),
        insurance_company: payload.insuranceCompany || null,
        insurance_agent_name: payload.insuranceAgentName || null,
        insurance_agent_contact: payload.insuranceAgentContact || null,
        insurance_agent_phone_number: payload.insuranceAgentPhoneNumber || null,
        insurance_agent_email_address: payload.insuranceAgentEmailAddress || null,
        insurance_policy_number: payload.insurancePolicyNumber || null,
        hoi_effective_date: payload.hoiEffectiveDate || null,
        hoi_expiration_date: payload.hoiExpirationDate || null,
        coverage_a_dwelling: parseNumeric(payload.coverageADwelling),
        coverage_b_other_structures: parseNumeric(payload.coverageBOtherStructures),
        coverage_c_personal_property: parseNumeric(payload.coverageCPersonalProperty),
        coverage_d_fair_rental_value: parseNumeric(payload.coverageDFairRentalValue),
        coverage_e_additional_living_expenses: parseNumeric(payload.coverageEAdditionalLivingExpenses),
        initial_lease_tenant_name: payload.initialLeaseTenantName || null,
        lease_effective_date: payload.leaseEffectiveDate || null,
        lease_termination_date: payload.leaseTerminationDate || null,
        owner_name: payload.ownerName || null,
        owner_principal_address: payload.ownerPrincipalAddress || null,
        owner_phone_number: payload.ownerPhoneNumber || null,
        owner_email_address: payload.ownerEmailAddress || null,
        company_name: payload.companyName || null,
        company_address: payload.companyAddress || null,
        company_phone_number: payload.companyPhoneNumber || null,
        company_email_address: payload.companyEmailAddress || null,
        title_company: payload.titleCompany || null,
        title_company_contact: payload.titleCompanyContact || null,
        title_company_phone_number: payload.titleCompanyPhoneNumber || null,
        title_company_email_address: payload.titleCompanyEmailAddress || null,
        lender_mortgage_name: payload.lenderMortgageName || null,
        lender_mortgage_address: payload.lenderMortgageAddress || null,
        lender_mortgage_phone: payload.lenderMortgagePhone || null,
        lender_mortgage_web_page: payload.lenderMortgageWebPage || null,
        mortgage_servicing_company: payload.mortgageServicingCompany || null,
        mortgage_servicing_company_address: payload.mortgageServicingCompanyAddress || null,
        mortgage_servicing_company_phone_number: payload.mortgageServicingCompanyPhoneNumber || null,
        lender_web_page: payload.lenderWebPage || null,
        borrower_name: payload.borrowerName || null,
        lender_name: payload.lenderName || null,
        closing_date: payload.closingDate || null,
        notes: payload.notes || null
      };

      console.log('Inserting property data:', Object.keys(propertyData).filter(key => propertyData[key] !== null));

      const { data: property, error } = await supabase
        .from('property')
        .insert(propertyData)
        .select()
        .single();

      if (error) {
        console.error('Property creation error:', error);
        throw error;
      }

      console.log('Property created successfully:', property.property_id);

      // Generate mortgage amortization schedule if we have required data
      if (property.loan_amount && property.interest_rate && property.term_years && property.first_payment_date) {
        console.log('📊 Property has mortgage data, generating amortization schedule...');

        try {
          const { generateAmortizationSchedule, calculatePITI } = require('../utils/mortgage-calculator');

          // Generate schedule
          const { schedule, summary } = generateAmortizationSchedule({
            loanAmount: parseFloat(property.loan_amount),
            annualInterestRate: parseFloat(property.interest_rate),
            termYears: parseInt(property.term_years),
            firstPaymentDate: new Date(property.first_payment_date),
            homeValue: property.valuation ? parseFloat(property.valuation) : null,
            taxBracket: 0.15
          });

          // Calculate PITI
          const monthlyPaymentPITI = calculatePITI(
            summary.monthly_payment_pi,
            property.taxes || 0,
            property.insurance || 0,
            0 // PMI
          );

          // Insert schedule in batches
          const batchSize = 100;
          const scheduleWithPropertyId = schedule.map(payment => ({
            property_id: property.property_id,
            ...payment
          }));

          for (let i = 0; i < scheduleWithPropertyId.length; i += batchSize) {
            const batch = scheduleWithPropertyId.slice(i, i + batchSize);
            await supabase.from('mortgage_payment_schedule').insert(batch);
          }

          // Save summary
          await supabase.from('mortgage_summary').insert({
            property_id: property.property_id,
            loan_amount: summary.loan_amount,
            interest_rate: summary.interest_rate,
            term_years: summary.term_years,
            first_payment_date: summary.first_payment_date.toISOString().split('T')[0],
            monthly_payment_pi: summary.monthly_payment_pi,
            monthly_payment_piti: monthlyPaymentPITI,
            home_value: summary.home_value,
            yearly_property_taxes: property.taxes || 0,
            yearly_hoi: property.insurance || 0,
            monthly_pmi: 0,
            total_payments: summary.total_payments,
            total_interest: summary.total_interest,
            total_principal: summary.total_principal,
            tax_bracket: summary.tax_bracket,
            total_tax_returned: summary.total_tax_returned,
            effective_interest_rate: summary.effective_interest_rate
          });

          console.log(`✅ Amortization schedule generated: ${schedule.length} payments`);
        } catch (scheduleError) {
          console.error('Failed to generate amortization schedule:', scheduleError);
          // Don't fail the property creation, just log the error
        }
      }

      res.status(201).json(property);
    } catch (error) {
      console.error('Failed to create property:', error);
      res.status(500).json({
        error: 'Failed to create property',
        details: error.message
      });
    }
  });

  app.put('/api/properties/:propertyId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const propertyId = req.params.propertyId;
    const isDemo = isDemoUser(ownerId);

    const payload = req.body || {};
    console.log('Updating property:', propertyId, 'for owner:', ownerId);

    try {
      // Verify ownership
      if (!isDemo) {
        const { data: existingProperty, error: ownershipError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', propertyId)
          .single();

        if (ownershipError || !existingProperty) {
          return res.status(404).json({ error: 'Property not found' });
        }

        if (existingProperty.person_id !== ownerId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Map frontend field names to database column names
      const propertyData = {
        address: payload.address || null,
        city: payload.city || null,
        state: payload.state || null,
        zip_code: payload.zipCode || null,
        property_type: payload.propertyType || null,
        valuation: parseNumeric(payload.valuation),
        purchase_price: parseNumeric(payload.purchasePrice),
        refinance_price: parseNumeric(payload.refinancePrice),
        purchase_refinance_closing_date: payload.purchaseRefinanceClosingDate || null,
        rent: parseNumeric(payload.rent),
        gross_monthly_income_rent: parseNumeric(payload.grossMonthlyIncomeRent),
        property_management_percentage: parseNumeric(payload.propertyManagementPercentage),
        property_management_amount: parseNumeric(payload.propertyManagementAmount),
        net_monthly_income: parseNumeric(payload.netMonthlyIncome),
        taxes: parseNumeric(payload.taxes),
        insurance: parseNumeric(payload.insurance),
        hoa: parseNumeric(payload.hoa),
        maintenance: parseNumeric(payload.maintenance),
        vacancy: parseNumeric(payload.vacancy),
        loan_rate: parseNumeric(payload.loanRate),
        loan_term: parseNumeric(payload.loanTerm),
        loan_amount: parseNumeric(payload.loanAmount),
        loan_number: payload.loanNumber || null,
        monthly_payment_principal_interest: parseNumeric(payload.monthlyPaymentPrincipalInterest),
        escrow_property_tax: parseNumeric(payload.escrowPropertyTax),
        escrow_home_owner_insurance: parseNumeric(payload.escrowHomeOwnerInsurance),
        total_monthly_payment_piti: parseNumeric(payload.totalMonthlyPaymentPiti),
        home_owner_insurance_initial_escrow: parseNumeric(payload.homeOwnerInsuranceInitialEscrow),
        property_taxes_initial_escrow: parseNumeric(payload.propertyTaxesInitialEscrow),
        first_payment_date: payload.firstPaymentDate || null,
        pre_payment_penalty: payload.prePaymentPenalty || null,
        monthly_payment: parseNumeric(payload.monthlyPayment),
        interest_rate: parseNumeric(payload.interestRate),
        term_years: parseNumeric(payload.termYears),
        ltv: parseNumeric(payload.ltv),
        down_payment: parseNumeric(payload.downPayment),
        year_1: parseNumeric(payload.year1),
        year_2: parseNumeric(payload.year2),
        year_3: parseNumeric(payload.year3),
        year_4: parseNumeric(payload.year4),
        year_5: parseNumeric(payload.year5),
        property_tax_county: payload.propertyTaxCounty || null,
        tax_authority: payload.taxAuthority || null,
        tax_authority_web_page: payload.taxAuthorityWebPage || null,
        account_number: payload.accountNumber || null,
        assessed_value: parseNumeric(payload.assessedValue),
        taxes_paid_last_year: parseNumeric(payload.taxesPaidLastYear),
        property_tax_percentage: parseNumeric(payload.propertyTaxPercentage),
        insurance_initial_premium: parseNumeric(payload.insuranceInitialPremium),
        insurance_company: payload.insuranceCompany || null,
        insurance_agent_name: payload.insuranceAgentName || null,
        insurance_agent_contact: payload.insuranceAgentContact || null,
        insurance_agent_phone_number: payload.insuranceAgentPhoneNumber || null,
        insurance_agent_email_address: payload.insuranceAgentEmailAddress || null,
        insurance_policy_number: payload.insurancePolicyNumber || null,
        hoi_effective_date: payload.hoiEffectiveDate || null,
        hoi_expiration_date: payload.hoiExpirationDate || null,
        coverage_a_dwelling: parseNumeric(payload.coverageADwelling),
        coverage_b_other_structures: parseNumeric(payload.coverageBOtherStructures),
        coverage_c_personal_property: parseNumeric(payload.coverageCPersonalProperty),
        coverage_d_fair_rental_value: parseNumeric(payload.coverageDFairRentalValue),
        coverage_e_additional_living_expenses: parseNumeric(payload.coverageEAdditionalLivingExpenses),
        initial_lease_tenant_name: payload.initialLeaseTenantName || null,
        lease_effective_date: payload.leaseEffectiveDate || null,
        lease_termination_date: payload.leaseTerminationDate || null,
        owner_name: payload.ownerName || null,
        owner_principal_address: payload.ownerPrincipalAddress || null,
        owner_phone_number: payload.ownerPhoneNumber || null,
        owner_email_address: payload.ownerEmailAddress || null,
        company_name: payload.companyName || null,
        company_address: payload.companyAddress || null,
        company_phone_number: payload.companyPhoneNumber || null,
        company_email_address: payload.companyEmailAddress || null,
        title_company: payload.titleCompany || null,
        title_company_contact: payload.titleCompanyContact || null,
        title_company_phone_number: payload.titleCompanyPhoneNumber || null,
        title_company_email_address: payload.titleCompanyEmailAddress || null,
        lender_mortgage_name: payload.lenderMortgageName || null,
        lender_mortgage_address: payload.lenderMortgageAddress || null,
        lender_mortgage_phone: payload.lenderMortgagePhone || null,
        lender_mortgage_web_page: payload.lenderMortgageWebPage || null,
        mortgage_servicing_company: payload.mortgageServicingCompany || null,
        mortgage_servicing_company_address: payload.mortgageServicingCompanyAddress || null,
        mortgage_servicing_company_phone_number: payload.mortgageServicingCompanyPhoneNumber || null,
        lender_web_page: payload.lenderWebPage || null,
        borrower_name: payload.borrowerName || null,
        lender_name: payload.lenderName || null,
        closing_date: payload.closingDate || null,
        notes: payload.notes || null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating property data:', Object.keys(propertyData).filter(key => propertyData[key] !== null));

      const { data: property, error } = await supabase
        .from('property')
        .update(propertyData)
        .eq('property_id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('Property update error:', error);
        throw error;
      }

      console.log('Property updated successfully:', property.property_id);
      res.json(property);
    } catch (error) {
      console.error('Failed to update property:', error);
      res.status(500).json({
        error: 'Failed to update property',
        details: error.message
      });
    }
  });

  app.get('/api/properties', requireAuth, async (req, res) => {
    try {
      const ownerId = req.user.id;
      console.log('Loading properties for owner:', ownerId);

      const propertiesResult = await fetchPropertiesForOwner(supabase, ownerId);
      if (propertiesResult.error) {
        throw propertiesResult.error;
      }

      const propertyRows = propertiesResult.data || [];
      console.log('Returning user properties:', propertyRows.length, 'items');
      res.json(propertyRows);
    } catch (error) {
      console.error('Failed to load properties - Full error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      res.status(500).json({
        error: 'Failed to load properties',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }
  });

  app.get('/api/properties/available', requireAuth, async (req, res) => {
    try {
      const ownerId = req.user.id;
      console.log('Loading available properties for owner:', ownerId);
      const properties = await fetchAvailablePropertiesForOwner(supabase, ownerId);

      // Asegurarse de que occupancy_status siempre esté presente
      const propertiesWithStatus = properties.map(p => ({
        ...p,
        occupancy_status: p.occupancy_status || 'available'
      }));

      res.json(propertiesWithStatus);
    } catch (error) {
      console.error('Failed to load available properties - Full error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      res.status(500).json({
        error: 'Failed to load available properties',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }
  });

  app.delete('/api/properties/:propertyId', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const propertyId = req.params.propertyId;
    const isDemo = isDemoUser(ownerId);

    console.log('🗑️ Deleting property:', propertyId, 'for owner:', ownerId);

    try {
      // Verify ownership
      if (!isDemo) {
        const { data: existingProperty, error: ownershipError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', propertyId)
          .single();

        if (ownershipError || !existingProperty) {
          return res.status(404).json({ error: 'Property not found' });
        }

        if (existingProperty.person_id !== ownerId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Check for active tenancies
      const { data: activeTenancies, error: tenancyCheckError } = await supabase
        .from('property_tenancy')
        .select('tenancy_id, status')
        .eq('property_id', propertyId);

      if (tenancyCheckError) {
        console.error('Error checking tenancies:', tenancyCheckError);
        throw tenancyCheckError;
      }

      // Check if there are any active tenancies
      const hasActiveTenancies = (activeTenancies || []).some(t =>
        ACTIVE_TENANCY_STATUSES.has(t.status)
      );

      if (hasActiveTenancies) {
        return res.status(400).json({
          error: 'Cannot delete property with active tenancies',
          details: 'Please remove or terminate all active tenancies before deleting this property'
        });
      }

      // Check for active leases
      const { data: activeLeases, error: leaseCheckError } = await supabase
        .from('lease')
        .select('lease_id, status')
        .eq('property_id', propertyId);

      if (leaseCheckError) {
        console.error('Error checking leases:', leaseCheckError);
        throw leaseCheckError;
      }

      const hasActiveLeases = (activeLeases || []).some(l =>
        l.status === 'active' || l.status === 'pending'
      );

      if (hasActiveLeases) {
        return res.status(400).json({
          error: 'Cannot delete property with active leases',
          details: 'Please terminate or delete all active leases before deleting this property'
        });
      }

      // Delete related records first (in order of dependency)

      // Delete property_tenancy records
      if (activeTenancies && activeTenancies.length > 0) {
        const { error: tenancyDeleteError } = await supabase
          .from('property_tenancy')
          .delete()
          .eq('property_id', propertyId);

        if (tenancyDeleteError) {
          console.error('Error deleting tenancies:', tenancyDeleteError);
          throw tenancyDeleteError;
        }
      }

      // Delete lease invoices first (they depend on leases)
      if (activeLeases && activeLeases.length > 0) {
        const leaseIds = activeLeases.map(l => l.lease_id);

        // Delete payments related to invoices
        const { data: invoices } = await supabase
          .from('rent_invoice')
          .select('invoice_id')
          .in('lease_id', leaseIds);

        if (invoices && invoices.length > 0) {
          const invoiceIds = invoices.map(i => i.invoice_id);

          const { error: paymentDeleteError } = await supabase
            .from('payment_transaction')
            .delete()
            .in('invoice_id', invoiceIds);

          if (paymentDeleteError) {
            console.error('Error deleting payments:', paymentDeleteError);
            throw paymentDeleteError;
          }

          // Delete invoices
          const { error: invoiceDeleteError } = await supabase
            .from('rent_invoice')
            .delete()
            .in('lease_id', leaseIds);

          if (invoiceDeleteError) {
            console.error('Error deleting invoices:', invoiceDeleteError);
            throw invoiceDeleteError;
          }
        }

        // Delete leases
        const { error: leaseDeleteError } = await supabase
          .from('lease')
          .delete()
          .eq('property_id', propertyId);

        if (leaseDeleteError) {
          console.error('Error deleting leases:', leaseDeleteError);
          throw leaseDeleteError;
        }
      }

      // Delete mortgage payment schedule if they exist
      const { error: mortgageScheduleDeleteError } = await supabase
        .from('mortgage_payment_schedule')
        .delete()
        .eq('property_id', propertyId);

      if (mortgageScheduleDeleteError && mortgageScheduleDeleteError.code !== '42P01') {
        console.error('Error deleting mortgage schedule:', mortgageScheduleDeleteError);
        throw mortgageScheduleDeleteError;
      }

      // Delete mortgage summary if it exists
      const { error: mortgageSummaryDeleteError } = await supabase
        .from('mortgage_summary')
        .delete()
        .eq('property_id', propertyId);

      if (mortgageSummaryDeleteError && mortgageSummaryDeleteError.code !== '42P01') {
        console.error('Error deleting mortgage summary:', mortgageSummaryDeleteError);
        throw mortgageSummaryDeleteError;
      }

      // Delete property documents if they exist
      const { error: documentDeleteError } = await supabase
        .from('property_document')
        .delete()
        .eq('property_id', propertyId);

      if (documentDeleteError && documentDeleteError.code !== '42P01') {
        console.error('Error deleting documents:', documentDeleteError);
        throw documentDeleteError;
      }

      // Delete property metrics if they exist
      const { error: metricsDeleteError } = await supabase
        .from('property_metrics')
        .delete()
        .eq('property_id', propertyId);

      if (metricsDeleteError && metricsDeleteError.code !== '42P01') {
        console.error('Error deleting metrics:', metricsDeleteError);
        throw metricsDeleteError;
      }

      // Finally, delete the property
      const { error: propertyDeleteError } = await supabase
        .from('property')
        .delete()
        .eq('property_id', propertyId);

      if (propertyDeleteError) {
        console.error('Error deleting property:', propertyDeleteError);
        throw propertyDeleteError;
      }

      console.log('✅ Property deleted successfully:', propertyId);
      res.status(200).json({
        message: 'Property deleted successfully',
        property_id: propertyId
      });
    } catch (error) {
      console.error('Failed to delete property:', error);
      res.status(500).json({
        error: 'Failed to delete property',
        details: error.message
      });
    }
  });

  app.get('/api/leases', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    console.log('Loading leases for owner:', ownerId);

    try {
      // Get properties owned by this user
      const propertiesResult = await fetchPropertiesForOwner(supabase, ownerId);
      if (propertiesResult.error) {
        throw propertiesResult.error;
      }

      const propertyIds = (propertiesResult.data || []).map(p => p.property_id);
      
      if (!propertyIds.length) {
        return res.json([]);
      }

      // Get leases for these properties
      const { data: leasesData, error: leasesError } = await supabase
        .from('lease')
        .select('*')
        .in('property_id', propertyIds)
        .order('start_date', { ascending: false });

      if (leasesError) {
        throw leasesError;
      }

      console.log(`Returning ${leasesData?.length || 0} leases`);
      res.json(leasesData || []);
    } catch (error) {
      console.error('Failed to load leases:', error);
      res.status(500).json({ error: 'Failed to load leases', details: error.message });
    }
  });

  app.put('/api/leases/:id', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const { id } = req.params;
    const leaseData = req.body;

    console.log(`📝 Updating lease ${id}`);

    try {
      // Verify lease exists and get property_id
      const { data: existingLease, error: leaseError } = await supabase
        .from('lease')
        .select('property_id')
        .eq('lease_id', id)
        .single();

      if (leaseError || !existingLease) {
        return res.status(404).json({ error: 'Lease not found' });
      }

      // Check property ownership
      if (ownerId !== 'dummy-id') {
        const { data: propertyData, error: propertyError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', existingLease.property_id)
          .single();

        if (propertyError || !propertyData || propertyData.person_id !== ownerId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Update the lease
      const { data: updatedLease, error: updateError } = await supabase
        .from('lease')
        .update({
          property_id: leaseData.property_id,
          tenant_person_id: leaseData.tenant_person_id,
          status: leaseData.status,
          start_date: leaseData.start_date,
          end_date: leaseData.end_date,
          monthly_rent: parseFloat(leaseData.monthly_rent),
          security_deposit: parseFloat(leaseData.security_deposit || 0),
          rent_due_day: parseInt(leaseData.rent_due_day || 1),
          auto_generate_invoices: leaseData.auto_generate_invoices !== false,
          allow_partial_payments: leaseData.allow_partial_payments !== false,
          notes: leaseData.notes || ''
        })
        .eq('lease_id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lease:', updateError);
        return res.status(400).json({ error: 'Failed to update lease', details: updateError.message });
      }

      console.log(`✅ Lease updated successfully: ${id}`);
      res.json(updatedLease);
    } catch (error) {
      console.error('Failed to update lease:', error);
      res.status(500).json({ error: 'Failed to update lease', details: error.message });
    }
  });

  app.delete('/api/leases/:id', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const { id } = req.params;

    console.log(`🗑️ Deleting lease ${id}`);

    try {
      // Verify lease exists and get property_id
      const { data: existingLease, error: leaseError } = await supabase
        .from('lease')
        .select('property_id')
        .eq('lease_id', id)
        .single();

      if (leaseError || !existingLease) {
        return res.status(404).json({ error: 'Lease not found' });
      }

      // Check property ownership
      if (ownerId !== 'dummy-id') {
        const { data: propertyData, error: propertyError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', existingLease.property_id)
          .single();

        if (propertyError || !propertyData || propertyData.person_id !== ownerId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Delete the lease (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('lease')
        .delete()
        .eq('lease_id', id);

      if (deleteError) {
        console.error('Error deleting lease:', deleteError);
        return res.status(400).json({ error: 'Failed to delete lease', details: deleteError.message });
      }

      console.log(`✅ Lease deleted successfully: ${id}`);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete lease:', error);
      res.status(500).json({ error: 'Failed to delete lease', details: error.message });
    }
  });

  app.post('/api/leases/:id/payments', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { invoice_id, amount, method, payer_name } = req.body;

    console.log(`💰 Registering payment for lease ${id}, invoice ${invoice_id}`);

    try {
      // Verify lease ownership
      const { data: lease, error: leaseError } = await supabase
        .from('lease')
        .select('property_id')
        .eq('lease_id', id)
        .single();

      if (leaseError || !lease) {
        return res.status(404).json({ error: 'Lease not found' });
      }

      // Check property ownership
      if (ownerId !== 'dummy-id') {
        const { data: propertyData, error: propertyError } = await supabase
          .from('property')
          .select('person_id')
          .eq('property_id', lease.property_id)
          .single();

        if (propertyError || !propertyData || propertyData.person_id !== ownerId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Get the invoice to verify it belongs to this lease
      const { data: invoice, error: invoiceError } = await supabase
        .from('rent_invoice')
        .select('*')
        .eq('invoice_id', invoice_id)
        .eq('lease_id', id)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get next payment number for this lease
      const { data: existingPayments } = await supabase
        .from('payment_transaction')
        .select('payment_number')
        .eq('lease_id', id)
        .order('payment_number', { ascending: false })
        .limit(1);

      const nextPaymentNumber = existingPayments && existingPayments.length > 0
        ? existingPayments[0].payment_number + 1
        : 1;

      // Create payment transaction with explicit payment_id
      const { data: payment, error: paymentError } = await supabase
        .from('payment_transaction')
        .insert({
          payment_id: crypto.randomUUID(),
          lease_id: id,
          invoice_id: invoice_id,
          payment_number: nextPaymentNumber,
          method: method || 'cash',
          amount_usd: parseFloat(amount),
          fee_usd: 0,
          status: 'succeeded',
          received_at: new Date().toISOString(),
          payer_name: payer_name || 'Tenant'
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        return res.status(400).json({ error: 'Failed to create payment', details: paymentError.message });
      }

      // Update invoice status and amount_paid
      const newAmountPaid = parseFloat(invoice.amount_paid || 0) + parseFloat(amount);
      const newStatus = newAmountPaid >= parseFloat(invoice.amount_due) ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('rent_invoice')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus
        })
        .eq('invoice_id', invoice_id);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return res.status(400).json({ error: 'Failed to update invoice', details: updateError.message });
      }

      console.log(`✅ Payment registered successfully: $${amount} for invoice ${invoice_id}, new status: ${newStatus}`);
      res.json({
        message: 'Payment registered successfully',
        payment: payment,
        invoice_status: newStatus
      });
    } catch (error) {
      console.error('Failed to register payment:', error);
      res.status(500).json({ error: 'Failed to register payment', details: error.message });
    }
  });




}

module.exports = { registerClientRoutes };
