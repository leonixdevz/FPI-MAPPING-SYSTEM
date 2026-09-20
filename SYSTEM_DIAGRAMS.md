# Chapter Three — System Diagrams (Mermaid)

Mermaid sources for the Chapter Three figures of the project report. Rendered
PNG copies live in `figures/` (`fig-3-1.png` … `fig-3-4.png`).

Regenerate after editing a block below:

```bash
npx -y @mermaid-js/mermaid-cli -i <block>.mmd -o figures/fig-3-x.png -b white -s 2
```

---

## Figure 3.1 — Context Diagram (Level 0 DFD)

The system as a single process, with its external entities and the spatial
database it serves.

```mermaid
flowchart LR
    USER["Public User"]
    ADMIN["Administrator"]
    SYS(("0<br/>Interactive School<br/>Mapping System"))
    DB[("PostgreSQL /<br/>PostGIS Spatial<br/>Database")]

    USER -- "map, search and feature-selection requests" --> SYS
    SYS -- "campus map, feature details, search results, user location" --> USER
    ADMIN -- "credentials; create / update / delete feature requests" --> SYS
    SYS -- "authentication result, feature records, statistics, operation status" --> ADMIN
    SYS -- "store and retrieve spatial + attribute data" --> DB
    DB -- "GeoJSON features and boundary" --> SYS
```

---

## Figure 3.2 — Level 1 Data Flow Diagram (DFD)

Decomposition into the five major processes, with the spatial data stores.

```mermaid
flowchart TB
    USER["Public User"]
    ADMIN["Administrator"]

    P1(("1.0<br/>User Access and<br/>Map Viewing"))
    P2(("2.0<br/>Feature Search and<br/>Identification"))
    P3(("3.0<br/>Administrator<br/>Authentication"))
    P4(("4.0<br/>Spatial Feature<br/>Management"))
    P5(("5.0<br/>Spatial Database<br/>Management"))

    D1[("D1 buildings")]
    D2[("D2 roads")]
    D3[("D3 walkways")]
    D4[("D4 entrances")]
    D5[("D5 campus_boundary")]
    DS[("D6 admin sessions<br/>in-memory token store")]

    USER -- "open map, pan / zoom requests" --> P1
    P1 -- "GeoJSON feature layers and campus boundary" --> USER
    USER -- "search term, feature selection, locate-me" --> P2
    P2 -- "matching feature location and attribute details" --> USER

    P1 -- "spatial data requests" --> P5
    P2 -- "feature lookup" --> P5

    ADMIN -- "username and password" --> P3
    P3 -- "session token or rejection" --> ADMIN
    P3 -- "create, read, update, delete session records" --> DS
    DS -- "token validity" --> P4

    ADMIN -- "feature create / update / delete / statistics requests" --> P4
    P4 -- "operation status and updated records" --> ADMIN
    P4 -- "validated spatial + attribute data" --> P5
    P5 -- "stored or retrieved records" --> P4

    P5 -- "reads / writes" --> D1
    P5 -- "reads / writes" --> D2
    P5 -- "reads / writes" --> D3
    P5 -- "reads / writes" --> D4
    P5 -- "reads / writes" --> D5
```

---

## Figure 3.3 — Entity-Relationship (E-R) Diagram

Logical structure of the spatial database. Each spatial layer carries its own
geometry and attributes; there are no foreign keys between layers — they are
maintained as separate feature layers managed through one application. The
administrator session is an application-level entity (in-memory bearer-token
store), shown to reflect the access-control design in section 3.7.5.

```mermaid
erDiagram
    BUILDINGS {
        integer id PK "identity"
        text name
        text type
        text description
        jsonb tags "extra attributes"
        geometry geometry "Polygon SRID 4326"
        timestamptz created_at
        timestamptz updated_at "trigger-maintained"
    }
    ROADS {
        integer id PK "identity"
        text name
        text type
        text description
        text highway "road classification"
        jsonb tags
        geometry geometry "LineString SRID 4326"
        timestamptz created_at
        timestamptz updated_at
    }
    WALKWAYS {
        integer id PK "identity"
        text name
        text type
        text description
        text highway "e.g. footway"
        jsonb tags
        geometry geometry "LineString SRID 4326"
        timestamptz created_at
        timestamptz updated_at
    }
    ENTRANCES {
        integer id PK "identity"
        text name
        text type
        text description
        jsonb tags
        geometry geometry "Point SRID 4326"
        timestamptz created_at
        timestamptz updated_at
    }
    CAMPUS_BOUNDARY {
        integer id PK "singleton row id = 1"
        text name
        geometry geometry "Polygon SRID 4326"
        timestamptz created_at
    }
    ADMIN_SESSION {
        text token PK "random 256-bit bearer token"
        text username
        bigint expires_at "epoch ms, 12h TTL"
    }

    ADMIN_SESSION ||--o{ BUILDINGS : "manages"
    ADMIN_SESSION ||--o{ ROADS : "manages"
    ADMIN_SESSION ||--o{ WALKWAYS : "manages"
    ADMIN_SESSION ||--o{ ENTRANCES : "manages"
    ADMIN_SESSION ||--o{ CAMPUS_BOUNDARY : "manages"
```

---

## Figure 3.4 — System Flowchart

Logical sequence of operations for both the public user and the administrator,
including the geometry-validation gate on administrative writes (section 3.7.6).

```mermaid
flowchart TD
    START(["Start"]) --> OPEN["User opens the web application"]
    OPEN --> ROUTE{"Administrator route?"}

    ROUTE -- "No" --> LOADMAP["Load public map and spatial data from the API"]
    LOADMAP --> NAV["Pan / zoom across the campus map"]
    NAV --> PACT{"Public user action"}
    PACT -- "search" --> QUERY["Enter feature name"]
    QUERY --> FOUND{"Match found?"}
    FOUND -- "Yes" --> FLY["Fly to feature and display its attribute information"]
    FOUND -- "No" --> NAV
    PACT -- "select feature" --> IDENT["Display feature identification details"]
    PACT -- "locate me" --> GEO["Show user position and accuracy circle"]
    FLY --> END1(["End"])
    IDENT --> END1
    GEO --> END1

    ROUTE -- "Yes" --> LOGIN["Enter username and password"]
    LOGIN --> CRED{"Credentials valid?"}
    CRED -- "No" --> LOGIN
    CRED -- "Yes" --> DASH["Open administrative dashboard"]
    DASH --> VIEW["View statistics and filter spatial records"]
    VIEW --> AOP{"Administrative operation"}
    AOP -- "create" --> FORM["Enter attributes and draw geometry on the map"]
    AOP -- "edit" --> EFORM["Load feature and modify attributes / geometry"]
    AOP -- "delete" --> CONFIRM["Confirm deletion of selected record"]
    FORM --> GVAL{"Geometry valid for selected layer?"}
    EFORM --> GVAL
    GVAL -- "No" --> ERR["Show validation error and return to the form"]
    ERR --> FORM
    GVAL -- "Yes" --> STORE["Store or update record in PostGIS via the API"]
    CONFIRM --> DELETE["Remove record from the database"]
    STORE --> DASH
    DELETE --> DASH
    DASH -- "logout" --> END2(["End"])
```
