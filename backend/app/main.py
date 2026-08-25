from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.advisories import router as advisories_router
from app.api.routes.crawls import router as crawls_router
from app.api.routes.health import router as health_router
from app.api.routes.logs import router as logs_router
from app.api.routes.sources import router as sources_router
from app.api.routes.stats import router as stats_router
from app.api.routes.statistics import router as statistics_router

app = FastAPI(title='Gardiyan API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(health_router)
app.include_router(sources_router)
app.include_router(crawls_router)
app.include_router(advisories_router)
app.include_router(stats_router)
app.include_router(logs_router)
app.include_router(statistics_router)
