import { ref } from 'vue'
import { supabase } from './supabase'

export const user = ref(null)
export const perfil = ref(null)
export const cargandoAuth = ref(true)

export async function cargarSesion() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    if (user.value) await cargarPerfil()
    cargandoAuth.value = false

    supabase.auth.onAuthStateChange(async (_event, session) => {
        user.value = session?.user ?? null
        if (user.value) await cargarPerfil()
        else perfil.value = null
    })
}

async function cargarPerfil() {
    const { data } = await supabase.from('perfiles').select('*').eq('id', user.value.id).single()
    perfil.value = data
}

export async function iniciarSesion(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
}

export async function cerrarSesion() {
    await supabase.auth.signOut()
}

export function esAdmin() {
    return perfil.value?.rol === 'admin'
}
