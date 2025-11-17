// utils/storageTest.ts
import { supabase } from '@/lib/supabase';

export async function testStorageConnection(): Promise<void> {
  console.log('🧪 Testing storage connection...');

  try {
    // Test 1: Vérifier l'authentification
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('🔐 User auth:', userData?.user?.id, userError);

    // Test 2: Lister les buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('📦 Buckets:', buckets, bucketsError);

    // Test 3: Tester un upload simple
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testPath = `test/${crypto.randomUUID()}/test.txt`;

    console.log('📤 Testing upload to:', testPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(testPath, testFile);

    console.log('📤 Upload result:', uploadData, uploadError);

    if (uploadError) {
      throw uploadError;
    }

    // Test 4: Tester la suppression
    if (uploadData) {
      const { error: deleteError } = await supabase.storage
        .from('files')
        .remove([testPath]);
      console.log('🗑️ Delete test:', deleteError);
    }

    console.log('✅ Storage test completed successfully');

  } catch (error) {
    console.error('❌ Storage test failed:', error);
    throw error;
  }
}