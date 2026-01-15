"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Edit2, Trash2, Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type OrgMember = {
    id: string
    name: string
    email: string
    role: "Admin" | "Editor" | "Member"
}

export default function OrganizationUsersPage() {
    const [members, setMembers] = useState<OrgMember[]>([
        {
            id: "1",
            name: "John Doe",
            email: "johndoe@email.com",
            role: "Admin",
        },
        {
            id: "2",
            name: "johndoe",
            email: "-",
            role: "Editor",
        },
        {
            id: "3",
            name: "john",
            email: "-",
            role: "Member",
        },
    ])

    const [open, setOpen] = useState(false)
    const [newUser, setNewUser] = useState({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        role: "Member" as const,
    })

    const handleEdit = (id: string) => {
        // TODO: Implement edit functionality
        console.log("Edit member:", id)
    }

    const handleDelete = (id: string) => {
        setMembers(members.filter(member => member.id !== id))
    }

    const handleAddUser = () => {
        if (newUser.firstname && newUser.email) {
            const member: OrgMember = {
                id: Date.now().toString(),
                name: `${newUser.firstname} ${newUser.lastname}`.trim(),
                email: newUser.email,
                role: newUser.role,
            }
            setMembers([...members, member])
            setNewUser({ firstname: "", lastname: "", email: "", phone: "", role: "Member" })
            setOpen(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Organization members</h1>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" />
                                New User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-center">Add New User</DialogTitle>
                                <DialogDescription className="text-center">
                                    Enter the details for the new organization member.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className='grid gap-3'>
                                    <Label htmlFor="name">First Name</Label>
                                    <Input
                                        id="name"
                                        value={newUser.firstname}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, firstname: e.target.value })
                                        }
                                        placeholder="Enter user name"
                                    />
                                </div>
                                <div className='grid gap-3'>
                                    <Label htmlFor="name">Last Name</Label>
                                    <Input
                                        id="name"
                                        value={newUser.lastname}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, lastname: e.target.value })
                                        }
                                        placeholder="Enter user name"
                                    />
                                </div>
                                <div className='grid gap-3'>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, email: e.target.value })
                                        }
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className='grid gap-3'>
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(value: any) =>
                                            setNewUser({ ...newUser, role: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="Editor">Editor</SelectItem>
                                            <SelectItem value="Member">Member</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAddUser}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        Add User
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Remove user</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members?.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(member.id)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(member.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}