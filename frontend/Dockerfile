FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# 빌드 시 React Router의 Base URL이 반영되도록 환경변수 설정
ENV VITE_PUBLIC_URL=/OverseasPortal
RUN npm run build

FROM nginx:alpine

# Nginx의 기본 HTML 폴더가 아닌 서브 디렉토리 구조를 생성
RUN mkdir -p /usr/share/nginx/html/OverseasPortal
COPY --from=builder /app/dist /usr/share/nginx/html/OverseasPortal

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
