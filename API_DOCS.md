# YMH SAHA API Documentation

## Material Delivery Registration
**Endpoint:** `POST /material-delivery`

### Request Payload (JSON)
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "987e6543-e21b-12d3-a456-426614174321",
  "materialType": "KUM",
  "quantity": 25.5,
  "unit": "TON",
  "vehiclePlate": "34ABC12",
  "photoUrl": "https://storage.googleapis.com/ymh-saha/uploads/photo123.jpg",
  "photoHash": "a1b2c3d4e5f6...",
  "ocrRawText": "RAW OCR OUTPUT FROM VISION API...",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "createdAt": "2024-03-24T14:30:00.000Z"
}
```

### Response (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "987e6543-e21b-12d3-a456-426614174321",
  "materialType": "KUM",
  "quantity": 25.5,
  "unit": "TON",
  "vehiclePlate": "34ABC12",
  "photoUrl": "https://storage.googleapis.com/ymh-saha/uploads/photo123.jpg",
  "photoHash": "a1b2c3d4e5f6...",
  "ocrRawText": "RAW OCR OUTPUT FROM VISION API...",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "createdAt": "2024-03-24T14:30:00.000Z",
  "serverReceivedAt": "2024-03-24T14:30:05.123Z"
}
```

### Error Responses
- **400 Bad Request**: Invalid photoHash or missing fields.
- **401 Unauthorized**: Invalid JWT Token.
