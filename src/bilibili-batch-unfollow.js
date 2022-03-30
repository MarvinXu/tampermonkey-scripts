/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
// ==UserScript==
// @name         B站批量取关
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  B站批量取关
// @author       MarvinXu
// @match        https://space.bilibili.com/*/fans/follow*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

'use strict'

renderBtn1()
renderBtn2()

function renderBtn1() {
  const div = document.createElement
  const btn = document.createElement('button')
  btn.style = 'position: fixed; top: 50%; right: 0; z-index: 9999;'
  btn.textContent = '加载视频预览'
  btn.addEventListener('click', () => {
    loadVideoPreview()
  })
  document.body.appendChild(btn)
}

function renderBtn2() {
  const div = document.createElement
  const btn = document.createElement('button')
  btn.style = 'position: fixed; top: 60%; right: 0; z-index: 9999;'
  btn.textContent = '（慎点）清空当前分组'
  btn.addEventListener('click', () => {
    clearCurrentGroup()
  })
  document.body.appendChild(btn)
}

// unfollowList('98663042,439313856,390761647,65586192,272733458,10062277,362418926,402939387,15385187,430727036,37349250,395965581,10644464,450595813,314100871,10718004,265697457,36082940,340413544,516910508,10705745,315898473,49399674,580346,550462687,256883411,22465608,393342019,472742857,495328504,20067185,39229746,65890998,40546455,265578856,482852692,28744352,113362335,408287624,1920094463,1211078109,2248410,7613501,366732900,16210993,320491072,286664982,72523458,39298350,3959704,104250187,34579852,8253829,398486952,113696152,385179893,1856450829,88982953,5482958,18005478,7764742,279581836,65583216,473222648,481612541,1338715561,616628583,27441982,595270774,2804493,439021394,4099287,543826670,442375417,4686884,94751226')

async function clearCurrentGroup() {
  const follows = await getFollowList()
  for (const u of follows) {
    const res = await unfollow(u.mid)
    if (res.code === 0)
      console.log(`已取关：${u.uname}`)
  }
}

async function unfollowList(ids) {
  ids = ids.split(',')
  for (const id of ids) {
    const res = await unfollow(id)
    if (res.code === 0)
      console.log(`已取关：${id}`)
  }
}

function getFollowList() {
  const params = new URLSearchParams(location.search)
  const tagId = params.get('tagid')
  const mid = location.pathname.split('/')[1]
  return $fetch(`https://api.bilibili.com/x/relation/tag?mid=${mid}&tagid=${tagId}&ps=20`).then(res => res.data)
}

async function loadVideoPreview() {
  const ul = await getElement('.relation-list')
  const lis = [...ul.children]
  lis.forEach(async(li) => {
    const uid = li.querySelector('a').getAttribute('href').split('/')[3]
    const vList = await getVideoList(uid)
    const preview = document.createElement('div')
    preview.style = 'clear: left;'
    preview.innerHTML = vList.map(v => `
        <img src="${v.pic}@640w_400h_1c_!web-space-index-myvideo.webp" style="width:160px;height:100px;border-radius:0;">
      `).join('')
    li.appendChild(preview)
  })
}

async function updateUI() {
  console.log('start')
  const ul = await getElement('.relation-list')
  ul.innerHTML = ''

  const follows = await getFollowList()

  follows.forEach(async(u) => {
    const vList = await getVideoList(u.mid)

    const li = document.createElement('li')
    li.classList.add('list-item', 'clearfix')
    li.innerHTML
      = `
        <a class="cover">
          <img src="${u.face}@96w_96h_1c.webp">
        </a>
        <div class="content">
          <a class="title">
            <span class="fans-name" style="color: rgb(251, 114, 153);">${u.uname}</span>
          </a>
          <p class="desc">
            ${u.sign}
          </p>
          ${vList.map(v => `
              <img src="${v.pic}@640w_400h_1c_!web-space-index-myvideo.webp" style="width:160px;height:100px;border-radius:0;">
            `).join('')}
        </div>
      `

    // add unfollow button
    const btn = document.createElement('button')
    btn.textContent = '取关'
    btn.addEventListener('click', () => {
      unfollow(u.mid)
      li.remove()
    })
    li.appendChild(btn)
    ul.append(li)
  })
}

function moveUsers(fids, beforeTagids, afterTagids) {
  const params = new URLSearchParams()
  params.append('beforeTagids', beforeTagids)
  params.append('afterTagids', beforeTagids)
  params.append('fids', fids)
  params.append('csrf', document.cookie.match(/bili_jct=([^;]+)/)[1])
  return $post('https://api.bilibili.com/x/relation/tags/moveUsers', params)
}

function unfollow(fid) {
  const params = new URLSearchParams()
  params.append('fid', fid)
  params.append('act', 2)
  params.append('csrf', document.cookie.match(/bili_jct=([^;]+)/)[1])

  return $post('https://api.bilibili.com/x/relation/modify', params)
}

function getVideoList(uid) {
  return $fetch(`https://api.bilibili.com/x/space/arc/search?mid=${uid}&pn=1&ps=3&index=1`).then(d => d.data?.list?.vlist)
}

// -------------------------utils-------------------------

function interceptXML() {
  const XMLOpen = window.XMLHttpRequest.prototype.open
  window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    console.log(url)
    XMLOpen.call(this, method, url, ...rest)
  }
}
function getElement(selector, container = document.body) {
  return new Promise((resolve, reject) => {
    if (typeof selector !== 'string' || !(container instanceof Node))
      return reject(new Error('Invalid param'))

    const target = document.querySelector(selector)
    if (target) {
      resolve(target)
    }
    else {
      const observer = new MutationObserver((mutationList, observer) => {
        const target = document.querySelector(selector)
        if (target) {
          observer.disconnect()
          resolve(target)
        }
        else {
          console.log(`waiting for $('${selector}') to mount`)
        }
      })
      observer.observe(container, { childList: true, subtree: true })
    }
  })
}

/**
  * shortcut for document.querySelectorAll
  * @param {String} selector
  */
function $(selector) {
  return document.querySelectorAll.bind(document)
}

function $fetch(url) {
  return fetch(url, { credentials: 'include' }).then(r => r.json())
}

function $post(url, params) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    credentials: 'include',
    body: params,
  }).then(r => r.json())
}
