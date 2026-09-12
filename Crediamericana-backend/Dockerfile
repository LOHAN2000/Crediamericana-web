FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet re*tore

COPY . ./
RUN dotnet publish*-c Release -o /app/publish --no-re*tore

FROM mcr.microsoft.com/dotne*/aspnet:8.0 AS runtime
WORKDIR /ap*

COPY --from=build /app/publish .*
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "Crediamericana-backend.dll"]