import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { Client } from 'pg'
import {
  OrganizationRole,
  organizationRoles,
} from '../../lib/organization/roles'

test(
  'live role boundaries, stale tokens, tenant-safe export, hosted publishing and return to AI',
  { skip: process.env.RUN_MVP_HTTP_TESTS !== 'true', timeout: 180000 },
  async () => {
    const db = new Client({ connectionString: process.env.DATABASE_URL })
    await db.connect()
    const org = `mvp-http-${randomUUID()}`,
      other = `mvp-http-${randomUUID()}`
    const users = Object.fromEntries(
      organizationRoles.map((role) => [role, randomUUID()]),
    ) as Record<OrganizationRole, string>
    const bot = randomUUID(),
      conv = randomUUID(),
      visitor = randomUUID(),
      lead = randomUUID(),
      foreign = randomUUID()
    const origin = process.env.MVP_DASHBOARD_URL || 'http://localhost:4000'
    const api = process.env.PYTHON_API_URL || 'http://localhost:18000'
    const key = readFileSync('keys/private.pem', 'utf8')
    const request = (
      role: OrganizationRole,
      path: string,
      body?: unknown,
      method = body === undefined ? 'GET' : 'POST',
    ) =>
      fetch(origin + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          Cookie: `auth_token=${jwt.sign({ sub: users[role], type: 'access' }, process.env.AUTH_JWT_SECRET!, { algorithm: 'HS256', issuer: 'chat-dashboard', audience: 'chat-dashboard-web', expiresIn: '5m' })}; current_organization_id=${org}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      })
    const staffToken = (
      role: OrganizationRole,
      type = 'staff_read',
      version = 0,
    ) =>
      jwt.sign(
        {
          organization_id: org,
          organization_role: role,
          sub: users[role],
          bot_id: bot,
          conversation_id: conv,
          type,
          handover_version: version,
        },
        key,
        {
          algorithm: 'RS256',
          issuer: 'dashboard-server',
          audience: 'chat-server',
          expiresIn: '5m',
        },
      )
    const publicRequest = (path: string, body: unknown) =>
      fetch(origin + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    const expectStatus = async (response: Response, status: number) => {
      assert.equal(
        response.status,
        status,
        `${response.url}: ${response.status} ${response.status !== status ? await response.text() : ''}`,
      )
      return response
    }
    try {
      await db.query(
        'INSERT INTO public.organizations(id,name) VALUES($1,$1),($2,$2)',
        [org, other],
      )
      for (const role of organizationRoles) {
        await db.query(
          'INSERT INTO public.users(id,email,full_name,updated_at) VALUES($1,$2,$3,now())',
          [users[role], `${users[role]}@example.invalid`, `Synthetic ${role}`],
        )
        await db.query(
          'INSERT INTO public.organization_members(id,organization_id,user_id,role) VALUES($1,$2,$3,$4)',
          [randomUUID(), org, users[role], role],
        )
      }
      await db.query(
        "INSERT INTO public.bots(id,name,organization_id,capture_leads,capture_name,capture_email,capture_phone,lead_capture_config) VALUES($1,'Synthetic test bot',$2,true,false,false,true,$3)",
        [
          bot,
          org,
          JSON.stringify({
            required: { name: false, email: false, phone: true },
            questions: [],
            hostedEnabled: true,
          }),
        ],
      )
      await db.query(
        "INSERT INTO public.conversations_meta(id,organization_id,bot_id,status,mode,visitor_connection_id,agent_connection_id,active_agent_id) VALUES($1,$2,$3,'open','human',$4,$5,$6)",
        [conv, org, bot, visitor, randomUUID(), users.counsellor],
      )
      for (const [id, organization, name] of [
        [lead, org, '=SYNTHETIC'],
        [foreign, other, 'FOREIGN PRIVATE'],
      ])
        await db.query(
          'INSERT INTO public.leads(id,organization_id,name,updated_at) VALUES($1,$2,$3,now())',
          [id, organization, name],
        )
      for (const role of [
        OrganizationRole.Viewer,
        OrganizationRole.Counsellor,
      ]) {
        for (const [path, body] of [
          ['/api/dashboard/leads/export', { ids: [lead] }],
          ['/api/bots/' + bot + '/capture', undefined],
          ['/api/dashboard/org-members', undefined],
          ['/api/billing/export', undefined],
        ] as const)
          await expectStatus(await request(role, path, body), 403)
      }
      await expectStatus(
        await request(OrganizationRole.Viewer, '/api/dashboard/leads', {
          name: 'Denied',
        }),
        403,
      )
      await expectStatus(
        await request(OrganizationRole.Viewer, '/api/auth/agent/token', {
          conversation_id: conv,
        }),
        403,
      )
      await expectStatus(
        await request(OrganizationRole.Admin, '/api/billing/export'),
        403,
      )
      for (const role of [OrganizationRole.Owner, OrganizationRole.Admin]) {
        const response = await expectStatus(
          await request(role, '/api/dashboard/leads/export', {
            ids: [lead, foreign],
          }),
          200,
        )
        const csv = await response.text()
        assert.ok(csv.includes("'=SYNTHETIC"))
        assert.ok(!csv.includes('FOREIGN PRIVATE'))
        assert.equal(response.headers.get('cache-control'), 'no-store')
      }
      for (const role of [
        OrganizationRole.Owner,
        OrganizationRole.Admin,
        OrganizationRole.Counsellor,
      ]) {
        const data = await (
          await expectStatus(
            await request(role, '/api/auth/agent/token', {
              conversation_id: conv,
            }),
            200,
          )
        ).json()
        const claims = jwt.decode(data.token) as jwt.JwtPayload
        assert.equal(claims.organization_role, role)
        assert.equal(claims.type, 'support_agent')
      }
      const currentCapture = await (await expectStatus(await request(OrganizationRole.Admin,`/api/bots/${bot}/capture`),200)).json()
      const body={...currentCapture, config:{...currentCapture.config,questions:[{id:'field_degree',label:'Highest qualification',type:'select',required:true,options:['School','Degree']}]}}
      delete body.fields
      const saved=await (await expectStatus(await request(OrganizationRole.Admin,`/api/bots/${bot}/capture`,body,'PATCH'),200)).json()
      assert.notEqual(saved.updatedAt,body.updatedAt)
      await expectStatus(await request(OrganizationRole.Admin,`/api/bots/${bot}/capture`,body,'PATCH'),409)
      await expectStatus(await request(OrganizationRole.Counsellor,`/api/bots/${bot}/capture`,{...body,updatedAt:saved.updatedAt},'PATCH'),403)
      await db.query('UPDATE public.organization_members SET role=$1 WHERE organization_id=$2 AND user_id=$3',[OrganizationRole.Counsellor,org,users.admin])
      await expectStatus(await request(OrganizationRole.Admin,`/api/dashboard/conversations/${conv}/return-to-ai`,{}),403)
      await db.query('UPDATE public.organization_members SET role=$1 WHERE organization_id=$2 AND user_id=$3',[OrganizationRole.Admin,org,users.admin])
      for(const [path,forbidden] of [['/dashboard/overview','Configure your bot'],['/dashboard/users/leads','Export CSV'],['/dashboard/users/follow-ups','New follow-up']]){
        const response=await expectStatus(await request(OrganizationRole.Viewer,path),200)
        const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
        assert.ok(!html.includes(forbidden),`Viewer must not see ${forbidden}`)
      }
      const viewerToken = staffToken(OrganizationRole.Viewer)
      await expectStatus(
        await fetch(`${api}/api/conversations/${conv}/messages`, {
          headers: { Authorization: `Bearer ${viewerToken}` },
        }),
        200,
      )
      await expectStatus(
        await fetch(`${api}/api/conversations/${conv}/return-to-ai`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${viewerToken}` },
        }),
        403,
      )
      const stale = staffToken(OrganizationRole.Admin)
      await db.query(
        'UPDATE public.organization_members SET role=$1 WHERE organization_id=$2 AND user_id=$3',
        [OrganizationRole.Viewer, org, users.admin],
      )
      await expectStatus(
        await fetch(`${api}/api/conversations/${conv}/messages`, {
          headers: { Authorization: `Bearer ${stale}` },
        }),
        403,
      )
      await db.query(
        'UPDATE public.organization_members SET role=$1 WHERE organization_id=$2 AND user_id=$3',
        [OrganizationRole.Admin, org, users.admin],
      )
      await expectStatus(
        await request(
          OrganizationRole.Counsellor,
          `/api/dashboard/conversations/${conv}/return-to-ai`,
          {},
        ),
        200,
      )
      const state = (
        await db.query(
          'SELECT mode,status,visitor_connection_id,agent_connection_id,active_agent_id,handover_version FROM public.conversations_meta WHERE id=$1',
          [conv],
        )
      ).rows[0]
      assert.deepEqual(state, {
        mode: 'ai',
        status: 'open',
        visitor_connection_id: visitor,
        agent_connection_id: null,
        active_agent_id: null,
        handover_version: 1,
      })
      await expectStatus(
        await request(
          OrganizationRole.Counsellor,
          `/api/dashboard/conversations/${conv}/return-to-ai`,
          {},
        ),
        200,
      )
      await db.query(
        "UPDATE public.conversations_meta SET status='closed' WHERE id=$1",
        [conv],
      )
      await expectStatus(
        await request(
          OrganizationRole.Counsellor,
          `/api/dashboard/conversations/${conv}/return-to-ai`,
          {},
        ),
        409,
      )
      const config = await (
        await expectStatus(
          await publicRequest('/api/widget/config', {
            api_key: `hosted:${bot}`,
          }),
          200,
        )
      ).json()
      assert.equal(config.profile.capture.required.phone, true)
      assert.equal(config.profile.capture.required.email, false)
      assert.equal(config.profile.organizationId, undefined)
      const visitorAuth = await (
        await expectStatus(
          await publicRequest('/api/auth/user/token', {
            api_key: `hosted:${bot}`,
          }),
          200,
        )
      ).json()
      assert.equal(
        (jwt.decode(visitorAuth.token) as jwt.JwtPayload).type,
        'user',
      )
      await db.query(
        "UPDATE public.bots SET lead_capture_config=jsonb_set(lead_capture_config,'{hostedEnabled}','false') WHERE id=$1",
        [bot],
      )
      await expectStatus(
        await publicRequest('/api/widget/config', { api_key: `hosted:${bot}` }),
        401,
      )
      await expectStatus(
        await publicRequest('/api/auth/user/token', {
          api_key: `hosted:${bot}`,
        }),
        401,
      )
      await assert.rejects(
        db.query(
          'UPDATE public.leads SET assigned_counsellor_id=$1 WHERE id=$2',
          [users.viewer, lead],
        ),
        /active Owner, Admin or Counsellor/,
      )
      await assert.rejects(
        db.query(
          'UPDATE public.organization_members SET role=$1 WHERE organization_id=$2 AND user_id=$3',
          [OrganizationRole.Viewer, org, users.owner],
        ),
        /last.*owner/i,
      )
    } finally {
      await db.query(
        'DELETE FROM public.organizations WHERE id=ANY($1::text[])',
        [[org, other]],
      )
      await db.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])', [
        Object.values(users),
      ])
      await db.end()
    }
  },
)
