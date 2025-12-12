'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ImageUploadDialog } from './ImageUploadDialog'
import { useState, Activity } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

export default function ProfilePage() {
  const [open, setOpen] = useState(false)
  return (
    <main className='max-h-dvh overflow-y-auto no-scrollbar'>
      <header className='shrink-0 mb-6'>
        <h1 className='dashboard-title'>Profile Settings</h1>
      </header>
      <Activity mode={open ? 'visible' : 'hidden'}>
        <ImageUploadDialog open={open} setOpen={setOpen} />
      </Activity>
      <form>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <section>
            <Button
              variant='icon'
              className='size-32'
              onClick={() => {
                setOpen(true)
              }}>
              <Avatar className='size-32 shadow-md border-3 border-sky-600'>
                <AvatarImage
                  sizes='100%'
                  src='https://github.com/shadcn.png'
                  alt='@shadcn'
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </Button>
          </section>
          <section className='my-auto'>
            <Label
              htmlFor='company-name'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Company/Organization Name
            </Label>
            <Input id='company-name' name='company-name' type='text' />
          </section>
          <section>
            <Label
              htmlFor='tenant-id'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Tenant ID
            </Label>
            <Input id='tenant-id' name='tenant-id' type='text' />
          </section>
          <section>
            <div className='flex justify-between'>
              <Label
                htmlFor='email'
                className='text-xs font-medium text-muted-foreground mb-2'>
                Email
              </Label>
              <Button
                variant='default'
                size='xs'
                className='text-xs px-2 mb-1 bg-amber-600'
                onClick={() => {
                  setOpen(true)
                }}>
                Verify Email
              </Button>
            </div>
            <Input id='email' name='email' type='email' />
          </section>
          <Separator className='col-span-2' />
          <h2 className='text-lg font-medium text-muted-foreground col-span-2'>
            Update Password
          </h2>
          <section>
            <Label
              htmlFor='new-password'
              className='text-xs font-medium text-muted-foreground mb-2'>
              New Password
            </Label>
            <Input id='new-password' name='new-password' type='password' />
          </section>
          <section>
            <Label
              htmlFor='confirm-password'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Confirm Password
            </Label>
            <Input
              id='confirm-password'
              name='confirm-password'
              type='password'
            />
          </section>
          <section className='col-span-2'>
            <Button variant='default' className='text-xs px-2 mb-1'>
              Update Password
            </Button>
          </section>
          <Separator className='col-span-2' />
          <h2 className='text-lg font-medium text-muted-foreground col-span-2'>
            Business Address Information
          </h2>
          <section>
            <Label
              htmlFor='address-line-1'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Address Line 1
            </Label>
            <Input id='address-line-1' name='address-line-1' type='text' />
          </section>
          <section>
            <Label
              htmlFor='address-line-2'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Address Line 2
            </Label>
            <Input id='address-line-2' name='address-line-2' type='text' />
          </section>
          <section>
            <Label
              htmlFor='city'
              className='text-xs font-medium text-muted-foreground mb-2'>
              City
            </Label>
            <Input id='city' name='city' type='text' />
          </section>
          <section>
            <Label
              htmlFor='state'
              className='text-xs font-medium text-muted-foreground mb-2'>
              State
            </Label>
            <Input id='state' name='state' type='text' />
          </section>
          <section>
            <Label
              htmlFor='zip-code'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Zip Code
            </Label>
            <Input id='zip-code' name='zip-code' type='text' />
          </section>
          <section>
            <Label
              htmlFor='country'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Country
            </Label>
            <Input id='country' name='country' type='text' />
          </section>
          <section>
            <Label
              htmlFor='phone-number'
              className='text-xs font-medium text-muted-foreground mb-2'>
              Phone Number
            </Label>
            <Input id='phone-number' name='phone-number' type='text' />
          </section>
          <section className='col-span-2'>
            <Button variant='default' className='text-xs'>
              Save Changes
            </Button>
          </section>
        </div>
      </form>
    </main>
  )
}
