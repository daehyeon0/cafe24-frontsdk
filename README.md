# Express OAuth Boilerplate

## 실행

```bash
npm install
npm run dev
```

## 엔드포인트

```http
GET /oauth/authorize
```

예시:

```bash
curl "http://localhost:3000/oauth/authorize?client_id=my-client&scope=openid"
```

서버 로그:

```text
[GET /oauth/authorize] querystring=client_id=my-client&scope=openid
```
