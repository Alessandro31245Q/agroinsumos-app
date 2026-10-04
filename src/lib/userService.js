// En desarrollo el proxy de Vite intercepta /api/users → Render (evita CORS)
// En producción se usa la URL completa del UserService
const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_USER_SERVICE_URL || 'https://userservice-517a.onrender.com').replace(/\/+$/, '')

/**
 * Procesa errores de respuesta de la API del UserService
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`
    try {
      const data = await response.json()
      if (typeof data === 'string') {
        errorMessage = data
      } else if (data.message) {
        errorMessage = data.message
      } else if (data.title) {
        if (data.errors && typeof data.errors === 'object') {
          const details = Object.values(data.errors).flat().join(', ')
          errorMessage = `${data.title}: ${details}`
        } else {
          errorMessage = data.title
        }
      } else if (data.error) {
        errorMessage = data.error
      }
    } catch {
      try {
        const text = await response.text()
        if (text) errorMessage = text
      } catch {
        // Usa el error por defecto
      }
    }
    throw new Error(errorMessage)
  }

  // Si no hay contenido (por ejemplo DELETE o 204 No Content)
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }
  return await response.text()
}

/**
 * 1. Crear un usuario (POST /api/users)
 * @param {{ correo: string, password: string, nombre: string, rol: string }} userData
 */
export async function createUser({ correo, password, nombre, rol = 'usuario' }) {
  const response = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ correo, password, nombre, rol }),
  })
  return handleResponse(response)
}

/**
 * 2. Listar todos los usuarios (GET /api/users)
 */
export async function getUsers() {
  const response = await fetch(`${API_BASE}/api/users`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })
  return handleResponse(response)
}

/**
 * 3. Obtener un usuario por ID (GET /api/users/{id})
 * @param {string} userId
 */
export async function getUserById(userId) {
  const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })
  return handleResponse(response)
}

/**
 * 4. Actualizar usuario (PUT /api/users/{id})
 * @param {string} userId
 * @param {{ nombre: string, correo: string }} data
 */
export async function updateUser(userId, { nombre, correo }) {
  const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ nombre, correo }),
  })
  return handleResponse(response)
}

/**
 * 5. Cambiar rol (PATCH /api/users/{id}/role)
 * @param {string} userId
 * @param {string} rol ('admin' | 'usuario')
 */
export async function updateUserRole(userId, rol) {
  const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ rol }),
  })
  return handleResponse(response)
}

/**
 * 6. Eliminar usuario (DELETE /api/users/{id})
 * @param {string} userId
 */
export async function deleteUser(userId) {
  const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  })
  return handleResponse(response)
}
