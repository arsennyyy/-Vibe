# syntax=docker/dockerfile:1

# --- Frontend (React/Vite) ---
FROM node:20-alpine AS front
WORKDIR /app/front
COPY front/package.json front/package-lock.json ./
RUN npm ci
COPY front/ ./
ENV VITE_API_URL=
RUN npm run build:deploy

# --- Backend (ASP.NET Core 8) ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/ ./backend/
COPY --from=front /app/backend/wwwroot ./backend/wwwroot
RUN dotnet publish backend/MyMvcBackend.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /out .
EXPOSE 10000
CMD ["dotnet", "MyMvcBackend.dll"]
