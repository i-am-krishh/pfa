import express from 'express';
import request from 'supertest';
import app from './server.js';

async function testRoute() {
    try {
        const res = await request(app).get('/api/family/my-family');
        console.log('Status:', res.status);
        console.log('Body:', res.body);
    } catch (err) {
        console.error('Error:', err);
    }
}

testRoute();
