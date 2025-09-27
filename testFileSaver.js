import FileSaver from './FileSaver';
import { Platform } from 'react-native';

// Simple test function to verify our FileSaver module works
export async function testFileSaver() {
    console.log('Testing FileSaver module...');
    
    if (Platform.OS !== 'android') {
        console.log('FileSaver test skipped - not Android platform');
        return;
    }
    
    try {
        // Test with a simple PDF (base64 encoded "Hello World" PDF)
        const simplePdfBase64 = 'JVBERi0xLjMNCiXi48/TDQoxIDAgb2JqDQo8PA0KL1R5cGUgL0NhdGFsb2cNCi9PdXRsaW5lcyAyIDAgUg0KL1BhZ2VzIDMgMCBSDQo+Pg0KZW5kb2JqDQoyIDAgb2JqDQo8PA0KL1R5cGUgL091dGxpbmVzDQovQ291bnQgMA0KPj4NCmVuZG9iag0KMyAwIG9iag0KPDwNCi9UeXBlIC9QYWdlcw0KL0NvdW50IDENCi9LaWRzIFs0IDAgUl0NCj4+DQplbmRvYmoNCjQgMCBvYmoNCjw8DQovVHlwZSAvUGFnZQ0KL1BhcmVudCAzIDAgUg0KL1Jlc291cmNlcyA8PA0KL0ZvbnQgPDwNCi9GMSA5IDAgUg0KPj4NCj4+DQovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQ0KL0NvbnRlbnRzIDUgMCBSDQo+Pg0KZW5kb2JqDQo1IDAgb2JqDQo8PA0KL0xlbmd0aCA0NA0KPj4NCnN0cmVhbQ0KQlQNCi9GMSA4IFRmDQoyNTAgNzAwIFRkDQooSGVsbG8gV29ybGQpIFRqDQpFVA0KZW5kc3RyZWFtDQplbmRvYmoNCjYgMCBvYmoNCjw8DQovVHlwZSAvRm9udA0KL0Jhc2VGb250IC9IZWx2ZXRpY2ENCi9TdWJ0eXBlIC9UeXBlMQ0KL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcNCj4+DQplbmRvYmoNCjcgMCBvYmoNCjw8DQovVHlwZSAvRm9udA0KL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZA0KL1N1YnR5cGUgL1R5cGUxDQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZw0KPj4NCmVuZG9iag0KOCA';
        
        const result = await FileSaver.savePdfToDownloads('test-file.pdf', simplePdfBase64);
        
        if (result.success) {
            console.log('✅ FileSaver test PASSED!');
            console.log('📁 File saved to:', result.filePath);
            console.log('📝 Message:', result.message);
            return true;
        } else {
            console.log('❌ FileSaver test FAILED - result success was false');
            return false;
        }
    } catch (error) {
        console.log('❌ FileSaver test FAILED with error:', error);
        return false;
    }
}

// Run the test if this file is imported directly in development
if (__DEV__) {
    setTimeout(() => {
        testFileSaver().then(success => {
            console.log(`FileSaver test completed: ${success ? 'SUCCESS' : 'FAILURE'}`);
        });
    }, 2000); // Wait 2 seconds after app startup
}
