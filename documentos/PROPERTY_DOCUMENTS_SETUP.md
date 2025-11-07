# Property Documents Feature - Setup Guide

This guide will help you set up the property documents management feature in your OwnerIQ application.

## Overview

The property documents feature allows users to:
- Upload various types of property-related documents (purchase agreements, closing documents, etc.)
- Store files securely in Supabase Storage
- Download and manage documents with a single click
- Organize documents by type for each property

## Setup Steps

### 1. Database Setup

Run the migration script to create the `property_document` table:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f property_documents_migration.sql
```

Or use the Supabase SQL Editor:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `property_documents_migration.sql`
4. Click "Run"

### 2. Supabase Storage Setup

#### Storage Bucket Setup

Your existing bucket structure:
- **Bucket Name**: `OwnerIQ`
- **Subfolder**: `property-documents/`

Files will be stored at: `OwnerIQ/property-documents/{property_id}/{filename}`

If you haven't created the `OwnerIQ` bucket yet:
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `OwnerIQ`
   - **Public bucket**: ❌ (Keep it private for security)
   - **File size limit**: Set according to your needs (e.g., 50MB)
   - **Allowed MIME types**: Leave empty or specify: `application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.*`

#### Set Storage Policies

After creating the bucket, set up Row Level Security (RLS) policies:

```sql
-- Policy: Users can upload documents for their own properties
CREATE POLICY "Users can upload property documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text
    FROM property
    WHERE person_id = auth.uid()
  )
);

-- Policy: Users can view documents for their own properties
CREATE POLICY "Users can view their property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text
    FROM property
    WHERE person_id = auth.uid()
  )
);

-- Policy: Users can delete documents for their own properties
CREATE POLICY "Users can delete their property documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'OwnerIQ' AND
  (storage.foldername(name))[1] = 'property-documents' AND
  (storage.foldername(name))[2] IN (
    SELECT property_id::text
    FROM property
    WHERE person_id = auth.uid()
  )
);
```

### 3. Frontend Integration

The `PropertyDocuments` component has been created at `frontend/src/components/PropertyDocuments.js`.

#### Option A: Add to Property Details Modal

Integrate the component into your property details view:

```javascript
import PropertyDocuments from './components/PropertyDocuments';

// In your property details component:
<PropertyDocuments 
  propertyId={selectedProperty.property_id} 
  userId={user.id} 
/>
```

#### Option B: Add as a Tab in Properties View

You can add it as a separate tab in the PropertiesView component in `App.js`:

```javascript
// Add state for selected property
const [selectedProperty, setSelectedProperty] = useState(null);
const [showDocuments, setShowDocuments] = useState(false);

// In your property card, add a documents button:
<button
  onClick={(e) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setShowDocuments(true);
  }}
  style={{
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  }}
>
  <i className="fas fa-file-alt"></i> Documents
</button>

// Add modal or section to show documents:
{showDocuments && selectedProperty && (
  <div className="modal">
    <PropertyDocuments 
      propertyId={selectedProperty.property_id} 
      userId={user.id} 
    />
    <button onClick={() => setShowDocuments(false)}>Close</button>
  </div>
)}
```

### 4. Supported Document Types

The system supports the following document types:
- **Purchase Agreement** - Property purchase contracts
- **Closing Documents** - Final closing paperwork
- **Title Deed** - Property title documents
- **Inspection Report** - Home inspection reports
- **Appraisal** - Property appraisal documents
- **Insurance Policy** - Property insurance documents
- **Tax Documents** - Property tax records
- **Lease Agreement** - Tenant lease agreements
- **Maintenance Records** - Repair and maintenance logs
- **Warranty** - Appliance and system warranties
- **Other** - Any other property-related documents

### 5. File Upload Limits

Default limits (can be adjusted in Supabase):
- **Maximum file size**: 50MB per file
- **Supported formats**: PDF, Word documents, Excel spreadsheets, images (PNG, JPG, etc.)
- **Storage**: Files are organized by property ID in the bucket

### 6. Security Considerations

✅ **Implemented Security Features:**
- Files are stored in a private bucket (not publicly accessible)
- Row Level Security (RLS) policies ensure users can only access their own property documents
- File paths include property_id to prevent unauthorized access
- User authentication required for all operations

⚠️ **Additional Recommendations:**
- Regularly backup your Supabase storage
- Monitor storage usage in Supabase Dashboard
- Consider implementing file scanning for malware (third-party service)
- Set appropriate file size limits based on your plan

### 7. Testing the Feature

1. **Upload a document:**
   - Navigate to a property
   - Click on the document type you want to upload
   - Select a file from your computer
   - Wait for the success message

2. **Download a document:**
   - Click the "Download" button next to any uploaded document
   - The file will download to your default downloads folder

3. **Delete a document:**
   - Click the "Delete" button next to any document
   - Confirm the deletion
   - The document will be removed from both storage and database

### 8. Troubleshooting

**Issue: "Failed to upload document"**
- Check that the storage bucket exists and is named `OwnerIQ`
- Verify the `property-documents` subfolder structure is correct
- Verify RLS policies are set correctly
- Check browser console for specific error messages

**Issue: "Failed to download document"**
- Ensure the file still exists in storage
- Check that RLS policies allow SELECT operations
- Verify the file_path in the database matches the actual storage path

**Issue: Documents not showing**
- Check that property_id is correctly passed to the component
- Verify the property_document table exists
- Check browser console for API errors

### 9. Future Enhancements

Consider adding:
- Document preview (PDF viewer)
- Document sharing with other users
- Document expiration dates (for insurance, warranties)
- Automatic OCR for text extraction
- Document templates
- Bulk upload functionality
- Document versioning

## Support

For issues or questions:
1. Check Supabase logs in the Dashboard
2. Review browser console for errors
3. Verify all setup steps were completed
4. Check that your Supabase project has sufficient storage quota

## File Structure

```
OwnerIQ/
├── property_documents_migration.sql          # Database migration
├── PROPERTY_DOCUMENTS_SETUP.md              # This file
└── frontend/
    └── src/
        └── components/
            └── PropertyDocuments.js          # React component