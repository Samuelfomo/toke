// import request from 'supertest';
//
// import app from '../server'; // ton app Express
//
// describe('📦 Upload API Tests', () => {
//   const testImage = './tests/files/test.jpg';
//   const testPdf = './tests/files/test.pdf';
//
//   it('should upload multiple attachments', async () => {
//     const res = await request(app)
//       .post('/upload/attachments')
//       .attach('files', testImage)
//       .attach('files', testPdf);
//
//     expect(res.statusCode).toBe(200);
//     expect(res.body.success).toBe(true);
//     expect(res.body.attachments).toHaveLength(2);
//
//     const shortUrl = res.body.attachments[0].shortUrl;
//     console.log('✅ Short URL:', shortUrl);
//   });
//
//   it('should return 400 if no file is uploaded', async () => {
//     const res = await request(app).post('/upload/attachments').set('Accept', 'application/json');
//
//     expect(res.statusCode).toBe(400);
//   });
// });
