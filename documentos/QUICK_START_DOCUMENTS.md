# Quick Start Guide - Property Documents Feature

## ✅ What's Been Implemented

1. **Database Table**: `property_document` table schema created
2. **React Component**: `PropertyDocuments.js` component for managing documents
3. **UI Integration**: "Docs" button added to each property card
4. **Modal View**: Full-screen modal to view/upload/manage documents

## 🚀 Setup Steps (Do These Now)

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run this command:

```sql
-- Copy and paste the entire contents of property_documents_migration.sql
```

Or use psql:
```bash
psql -h your-supabase-host -U postgres -d postgres -f property_documents_migration.sql
```

### Step 2: Verify Storage Bucket in Supabase

Your existing bucket structure:
- **Bucket Name**: `OwnerIQ`
- **Subfolder**: `property-documents/` (created automatically)

Files will be stored at: `OwnerIQ/property-documents/{property_id}/{filename}`

If the `OwnerIQ` bucket doesn't exist yet:
1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Settings:
   - **Name**: `OwnerIQ`
   - **Public**: ❌ (Keep private)
   - **File size limit**: 50MB (or your preference)
4. Click **"Create bucket"**

### Step 3: Set Storage Policies

In Supabase SQL Editor, run these policies:

```sql
-- Allow authenticated users to upload documents for their properties
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

-- Allow authenticated users to view their property documents
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

-- Allow authenticated users to delete their property documents
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

### Step 4: Enable RLS on property_document Table

```sql
-- Enable Row Level Security
ALTER TABLE property_document ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their properties
CREATE POLICY "Users can view their property documents"
ON property_document FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

-- Policy: Users can insert documents for their properties
CREATE POLICY "Users can insert property documents"
ON property_document FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);

-- Policy: Users can delete documents for their properties
CREATE POLICY "Users can delete property documents"
ON property_document FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT property_id 
    FROM property 
    WHERE person_id = auth.uid()
  )
);
```

## 📝 How to Use

### Upload Documents

1. Navigate to **Properties** view
2. Click the **"Docs"** button on any property card
3. A modal will open showing the document management interface
4. Select the document type (Purchase Agreement, Closing Documents, etc.)
5. Click the file input and select your file
6. The document will upload automatically

### View/Download Documents

1. Open the documents modal for any property
2. All uploaded documents are listed below the upload section
3. Click **"Download"** to download any document
4. Click **"Delete"** to remove a document (with confirmation)

### Supported Document Types

- Purchase Agreement
- Closing Documents
- Title Deed
- Inspection Report
- Appraisal
- Insurance Policy
- Tax Documents
- Lease Agreement
- Maintenance Records
- Warranty
- Other

## 🎯 Features

✅ **One-Click Access**: Click "Docs" button on any property card
✅ **Secure Storage**: Files stored in private Supabase bucket
✅ **Organized by Type**: Documents categorized by type
✅ **Easy Upload**: Simple file selection interface
✅ **Quick Download**: One-click download for any document
✅ **File Management**: Delete unwanted documents
✅ **File Info**: See file size, upload date, and type
✅ **User-Specific**: Only see documents for your own properties

## 🔒 Security

- All files stored in **private** bucket (not publicly accessible)
- Row Level Security (RLS) ensures users only access their own documents
- Authentication required for all operations
- Files organized by property_id to prevent unauthorized access

## 📂 File Organization

Files are stored in Supabase Storage with this structure:
```
OwnerIQ/                                    # Main bucket
└── property-documents/                     # Subfolder
    ├── {property_id_1}/
    │   ├── timestamp-random.pdf
    │   ├── timestamp-random.docx
    │   └── ...
    ├── {property_id_2}/
    │   └── ...
```

## ⚠️ Important Notes

1. **Complete all setup steps** before testing
2. **Verify the bucket name** is exactly `property-documents`
3. **Check RLS policies** are enabled on both storage and database
4. **Test with a real property** (not demo properties)
5. **Monitor storage usage** in Supabase Dashboard

## 🐛 Troubleshooting

**"Failed to upload document"**
- Verify storage bucket `OwnerIQ` exists
- Check that `property-documents` subfolder path is correct
- Verify RLS policies are set correctly
- Ensure you're authenticated
- Check browser console for errors

**"Failed to download document"**
- Verify file exists in storage
- Check RLS SELECT policy
- Ensure file_path in database matches storage

**Documents not showing**
- Verify property_document table exists
- Check that property_id is valid
- Review browser console for API errors

## 📊 Next Steps

After setup is complete:
1. Test uploading a document
2. Test downloading a document
3. Test deleting a document
4. Verify documents persist after page refresh
5. Check that documents are property-specific

## 📞 Need Help?

Check:
- Supabase Dashboard → Logs
- Browser Console (F12)
- Network tab for API errors
- Storage bucket contents

---

**Files Created:**
- `property_documents_migration.sql` - Database schema
- `frontend/src/components/PropertyDocuments.js` - React component
- `PROPERTY_DOCUMENTS_SETUP.md` - Detailed setup guide
- `QUICK_START_DOCUMENTS.md` - This quick reference