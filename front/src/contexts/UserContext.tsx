import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { config } from '@/config';

interface User {
    id: string;
    name: string;
    email: string;
    joinedDate: string;
    isAdmin?: boolean;
    isOrganizer?: boolean;
    avatarUrl?: string;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    isAuthenticated: boolean;
    logout: () => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored user data on component mount
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setIsLoading(false);
                axios.post(config.endpoints.qrSession, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, []);


    const handleSetUser = (newUser: User | null) => {
        setUser(newUser);
        if (newUser) {
            localStorage.setItem('user', JSON.stringify(newUser));
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        setIsLoading(false);
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <UserContext.Provider value={{
            user,
            setUser: handleSetUser,
            isAuthenticated: !!user,
            logout,
            isLoading
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 