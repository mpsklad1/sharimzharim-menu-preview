import {API_BASE,LEGACY_API_BASE} from './account.js?v=20261007-domain';
import {ManagerAccount} from './manager-account.js?v=20261007-domain';
import {ProductAvailability,isProductEnabled} from './product-availability.js?v=20261002-switch';
import {imageFor} from './menu-data.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('ru-RU').format(v||0)+' ₽';
const date=v=>v?new Date(v).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}):'—';
const account=new ManagerAccount();
const availability=new ProductAvailability(account);
let data=null,view='overview',editing=null,refreshing=false,catalogRevision=0;
let messageTimer=null;
const titles={overview:'Обзор',products:'Меню и товары',orders:'Заказы',customers:'Клиенты CRM',carts:'Корзины',analytics:'Аналитика',integrations:'Касса и рассылки'};
const status={active:'В продаже',out:'Нет в наличии',draft:'Черновик',archived:'Архив'};
function message(text){clearTimeout(messageTimer);$('#message').textContent=text;messageTimer=setTimeout(()=>$('#message').textContent='',6000);}
function productSwitch(p){
  const pending=availability.pending.get(p.id);
  const enabled=pending?.enabled??isProductEnabled(p);
  const detail=!enabled&&['draft','archived'].includes(p.status)?`<small>${status[p.status]}</small>`:'';
  return `<div class="availability-cell"><button type="button" class="availability-switch" role="switch" aria-checked="${enabled}" aria-label="В меню: ${esc(p.name)}" aria-busy="${!!pending}" data-toggle-product="${p.id}" ${pending?'disabled':''} title="${enabled?'Выключить':'Включить'} товар в меню"><span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span><span class="switch-label">${pending?'Сохраняю…':enabled?'Включён':'Выключен'}</span></button><span class="availability-detail">${detail}</span></div>`;
}
function syncProductSwitch(id){
  const entry=data?.products.find(p=>p.product.id===id);
  const button=document.querySelector(`[data-toggle-product="${id}"]`);
  if(!entry||!button)return;
  const pending=availability.pending.get(id);
  const enabled=pending?.enabled??isProductEnabled(entry.product);
  button.setAttribute('aria-checked',String(enabled));
  button.setAttribute('aria-busy',String(!!pending));
  button.disabled=!!pending;
  button.title=`${enabled?'Выключить':'Включить'} товар в меню`;
  button.querySelector('.switch-label').textContent=pending?'Сохраняю…':enabled?'Включён':'Выключен';
  button.closest('.availability-cell').querySelector('.availability-detail').textContent=!enabled&&['draft','archived'].includes(entry.product.status)?status[entry.product.status]:'';
  const edit=document.querySelector(`[data-edit="${id}"]`);if(edit)edit.disabled=!!pending;
}
async function toggleProduct(id,enabled){
  const entry=data?.products.find(p=>p.product.id===id);
  if(!entry||availability.pending.has(id))return;
  const next=enabled??!isProductEnabled(entry.product);
  if(next===isProductEnabled(entry.product))return;
  const requestToken=account.token;
  const button=document.querySelector(`[data-toggle-product="${id}"]`);
  const keepFocus=document.activeElement===button;
  catalogRevision++;
  const save=availability.set(entry,next);
  syncProductSwitch(id);
  try{
    const saved=await save;
    if(account.token!==requestToken||!data)return;
    const index=data.products.findIndex(p=>p.product.id===id);
    if(index>=0)data.products[index]=saved;
    message(`${saved.product.name}: ${next?'включён в меню':'выключен из меню'}`);
    $('#sync-status').textContent=`Общая база · сохранено ${date(new Date().toISOString())}`;
  }catch(e){
    if(account.token!==requestToken){showLogin();return;}
    message(`Не удалось изменить доступность. ${e.message}`);
    // Never retry a stale write automatically: another operator may have edited it.
    if(e.status===409)await refresh();
  }finally{
    catalogRevision++;
    syncProductSwitch(id);
    const current=document.querySelector(`[data-toggle-product="${id}"]`);
    if(keepFocus&&current&&(document.activeElement===document.body||document.activeElement===button))current.focus({preventScroll:true});
  }
}
function photo(p){
  if([API_BASE,LEGACY_API_BASE].some(base=>p.image_url?.startsWith(`${base}/catalog/images/`)))return `<span class="photo" style="background-image:url('${esc(p.image_url)}');background-size:cover;background-position:center"></span>`;
  const [name,cols,rows,pos]=imageFor(p.image);
  const image=new URL(`./menu-assets/${name}.webp`,import.meta.url).href;
  return `<span class="photo" style="background-image:url('${esc(image)}');background-size:${cols*100}% ${rows*100}%;background-position:${cols===1?0:pos%cols*100/(cols-1)}% ${rows===1?0:Math.floor(pos/cols)*100/(rows-1)}%"></span>`;
}
function table(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<div class="empty">Пока нет данных</div>';}
function orderRows(orders){return orders.map(o=>{
  const confirmed=o.status==='completed'&&o.paid_at&&o.fulfilled_at;
  const label=confirmed?'Покупка подтверждена':({demo:'Тестовый · не подтверждён',pending:'Ожидает оплаты',paid:'Оплачен',completed:'Выдан',cancelled:'Отменён',refunded:'Возврат'}[o.status]||o.status);
  return `<tr><td>${esc(o.id.slice(0,8).toUpperCase())}<small>${date(o.created_at)}</small></td><td>${esc(o.name)}<small>${o.source==='telegram'?'Telegram':o.source==='site'?'Сайт':'До подключения'}</small></td><td>${o.items.map(i=>`${esc(i.name)} × ${i.count}${i.options?.length?`<small>${i.options.map(esc).join(', ')}</small>`:''}`).join('<br>')}</td><td>${money(o.total)}</td><td><span class="badge">${esc(label)}</span>${confirmed?'<small>Отзывы доступны покупателю</small>':['demo','pending','paid'].includes(o.status)?`<button type="button" class="confirm-purchase-open" data-confirm-order="${esc(o.id)}">Подтвердить покупку</button>`:''}</td></tr>`;
});}
function render(){
  if(!data)return;
  $('#title').textContent=titles[view];
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
  const s=data.stats;let html='';
  if(view==='overview')html=`<div class="cards">${[['Клиенты',s.customers,'Общие аккаунты сайта и Mini App'],['Контакты бота',s.bot_contacts,'Учёт новых обращений с момента подключения'],['Демо-заказы сегодня',s.demo_orders_today,'За сутки по московскому времени'],['Подтверждённая сумма',money(s.revenue),'По отметкам об оплате и выдаче'],['Демо-заказы всего',s.demo_orders,'Это не реальные продажи'],['Сумма демо-заказов',money(s.demo_total),'Без списания денег'],['Брошенные корзины',s.abandoned_carts,'Без изменений больше 30 минут'],['Товары в продаже',data.products.filter(p=>p.product.status==='active').length,'Общий каталог']].map(([label,value,note])=>`<div class="card">${label}<strong>${value}</strong><small>${note}</small></div>`).join('')}</div><div class="spark">Изменения меню сохраняются в общей базе и появляются при следующей загрузке меню. Заказы, корзины и аккаунты сайта и Telegram учитываются вместе.</div><h2 style="margin-top:28px">Последние заказы</h2>${table(['Заказ','Клиент / канал','Состав','Сумма','Статус'],orderRows(data.orders.slice(0,8)))}`;
  if(view==='products')html=`<div class="toolbar"><input type="search" id="filter" placeholder="Поиск по меню"><button class="primary" id="add-product">Добавить товар</button></div><p class="availability-hint">Вправо — товар включён, влево — выключен. Сохраняется сразу для сайта и бота, без удаления товара.</p><div id="table-area"></div>`;
  if(view==='orders')html=`<p class="muted">Показаны последние ${data.orders.length} заказов, максимум ${data.limits.orders}. Отзывы доступны только после подтверждения реальной оплаты и выдачи. Тестовый заказ сам по себе права на отзыв не даёт.</p>${table(['Заказ','Клиент / канал','Состав','Сумма','Статус'],orderRows(data.orders))}`;
  if(view==='customers')html=`<div class="toolbar"><input type="search" id="filter" placeholder="Имя или Telegram"></div><p class="muted">Показаны последние ${data.customers.length} аккаунтов, максимум ${data.limits.customers}.</p><div id="table-area"></div>`;
  if(view==='carts')html=`<p class="muted">Только сохранённые корзины вошедших клиентов. Гостевые корзины нельзя привязать к Telegram. После демо-заказа корзина очищается.</p>${table(['Клиент','Товары','Сумма','Активность','Состояние'],data.carts.map(c=>`<tr><td><button data-customer="${c.user_id}">${esc(c.name)}</button></td><td>${c.items.map(i=>`${esc(i.name)} × ${i.count}`).join('<br>')}</td><td>${money(c.total)}</td><td>${date(c.updated_at)}<small>${c.source==='telegram'?'Telegram':'Сайт'}</small></td><td><span class="badge">${c.abandoned?'Брошена · >30 мин':'Активная'}</span></td></tr>`))}`;
  if(view==='analytics'){
    const ranked=data.products.map(({product:p})=>({p,...(data.analytics.find(a=>a.product_id===p.id)||{units:0,orders:0,demo_total:0})})).sort((a,b)=>b.units-a.units);
    html=`<h2>Популярность в демо-заказах</h2><p class="muted">По всем сохранённым демо-заказам. Это проверка спроса в тестовом режиме, не статистика оплаченных продаж. Позиции с нулём не означают «плохо продаются».</p>${table(['Позиция','Заказов','Количество','Демо-сумма'],ranked.map(a=>`<tr><td>${esc(a.p.name)}<small>${esc(a.p.category)}</small></td><td>${a.orders}</td><td>${a.units} шт.</td><td>${money(a.demo_total)}</td></tr>`))}`;
  }
  if(view==='integrations')html=`<h2>Что подключено</h2><ul><li>Общий каталог: сайт, Mini App, админка.</li><li>Telegram-вход и единая карточка клиента.</li><li>История заказов и синхронизация корзин.</li><li>Подтверждение покупки администратором и отзывы покупателей.</li><li>Игровые скидки — из существующей базы.</li></ul><h2 style="margin-top:24px">Что ещё нужно подключить</h2><ul><li>FreeKassa: реквизиты магазина и серверная проверка платежей. Сейчас платежи не принимаются.</li><li>Работа кухни: приём реальных заказов, статусы готовности и уведомления клиенту.</li><li>Рассылки: отдельный согласованный запуск по доступным контактам бота. Сейчас отправка отключена.</li><li>Склад: остатки, списания и себестоимость. Статус «Нет в наличии» доступен сейчас, количественный склад ещё нет.</li></ul>`;
  $('#content').innerHTML=html;
  if(view==='products'||view==='customers'){renderFiltered();$('#filter').addEventListener('input',renderFiltered);}
  $('#add-product')?.addEventListener('click',()=>editProduct(null));
}
function renderFiltered(){const q=($('#filter')?.value||'').toLocaleLowerCase('ru-RU');
  if(view==='products')$('#table-area').innerHTML=table(['Товар','Категория','Цена','В меню',''],data.products.filter(({product:p})=>`${p.name} ${p.category}`.toLowerCase().includes(q)).map(({product:p})=>`<tr><td><div class="product-cell">${photo(p)}<div>${esc(p.name)}<small>${esc(p.weight)}</small></div></div></td><td>${esc(p.category==='На булке'?'Бургеры':p.category)}</td><td>${money(p.price)}</td><td>${productSwitch(p)}</td><td><button data-edit="${p.id}" ${availability.pending.has(p.id)?'disabled':''}>Изменить</button></td></tr>`));
  if(view==='customers')$('#table-area').innerHTML=table(['Клиент','Telegram','Демо-заказы','Демо-сумма','Скидки'],data.customers.filter(c=>`${c.name} ${c.username||''} ${c.tg_id}`.toLowerCase().includes(q)).map(c=>`<tr><td><button data-customer="${c.id}">${esc(c.name)}</button><small>${date(c.created_at)}</small></td><td>${c.username?'@'+esc(c.username):esc(c.tg_id)}<small>${c.bot_contact?'Есть контакт с ботом':'Только аккаунт'}</small></td><td>${c.demo_order_count}</td><td>${money(c.demo_order_total)}</td><td>${money(c.discount_balance)}</td></tr>`));
}
async function refresh(){if(refreshing||availability.pending.size)return;refreshing=true;$('#refresh').disabled=true;const requestToken=account.token,requestRevision=catalogRevision;
  try{if(account.me?.must_change_password){showPasswordChange();return;}const snapshot=await account.request('/manage/snapshot');if(account.token!==requestToken||catalogRevision!==requestRevision)return;const query=$('#filter')?.value||'';data=snapshot;$('#login').hidden=true;$('#password-change').hidden=true;$('#content').hidden=false;$('#identity').textContent=account.me?.name||'Владелец';$('#logout').hidden=false;$('#change-password').hidden=false;render();if($('#filter')){$('#filter').value=query;renderFiltered();}$('#sync-status').textContent=`Общая база · обновлено ${date(data.generated_at)}`;}
  catch(e){showLogin();$('#login-error').textContent=e.message;}
  finally{refreshing=false;$('#refresh').disabled=false;}
}
function showLogin(){data=null;$('#login').hidden=false;$('#password-change').hidden=true;$('#content').hidden=true;$('#identity').textContent='Нет входа';$('#logout').hidden=!account.token;$('#change-password').hidden=true;$('#sync-status').textContent='';$('#editor').close();$('#customer').close();$('#purchase-confirmation').close();$('#purchase-confirmation-form').reset();$('#customer-content').textContent='';$('#product-form').reset();}
function showPasswordChange(){data=null;$('#content').hidden=true;$('#login').hidden=true;$('#password-change').hidden=false;$('#identity').textContent=account.me?.name||'Владелец';$('#logout').hidden=false;$('#change-password').hidden=true;$('#password-cancel').hidden=!!account.me?.must_change_password;$('#password-note').textContent=account.me?.must_change_password?'Первый вход: замените временный пароль своим. После этого откроется админка.':'После смены пароля другие сеансы будут завершены.';$('#sync-status').textContent='';}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,button=f.querySelector('[type=submit]');button.disabled=true;$('#login-error').textContent='';try{await account.login(f.elements.username.value.trim(),f.elements.password.value);f.elements.password.value='';if(account.me.must_change_password)showPasswordChange();else await refresh();}catch(e){$('#login-error').textContent=e.message;}finally{button.disabled=false;}});
$('#password-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,button=f.querySelector('[type=submit]');$('#password-error').textContent='';if(f.elements.new_password.value!==f.elements.confirm_password.value){$('#password-error').textContent='Новые пароли не совпадают.';return;}button.disabled=true;try{await account.changePassword(f.elements.current_password.value,f.elements.new_password.value);f.reset();await refresh();message('Пароль изменён. Другие сеансы завершены.');}catch(e){$('#password-error').textContent=e.message;}finally{button.disabled=false;}});
function editProduct(id){editing=id?data.products.find(p=>p.product.id===id):null;const p=editing?.product||{name:'',category:'Шаверма',price:0,weight:'',status:'draft',description:'',image:0,option_groups:[],variants:[]};const f=$('#product-form');for(const key of ['name','category','price','weight','status','description'])f.elements[key].value=p[key];for(const key of ['option_groups','variants'])f.elements[key].value=JSON.stringify(p[key],null,2);f.elements.photo.value='';$('#archive').hidden=!id;$('#editor-error').textContent='';$('#editor').showModal();}
function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Не удалось прочитать фото'));r.readAsDataURL(file);});}
$('#product-form').addEventListener('submit',async event=>{event.preventDefault();const f=event.target;const submit=f.querySelector('[type=submit]');submit.disabled=true;
  try{const file=f.elements.photo.files[0];if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1000000))throw new Error('Фото: PNG, JPEG или WebP до 1 МБ');const p={...(editing?.product||{image:0})};for(const key of ['name','category','weight','status','description'])p[key]=f.elements[key].value.trim();p.price=Number(f.elements.price.value);p.option_groups=JSON.parse(f.elements.option_groups.value);p.variants=JSON.parse(f.elements.variants.value);let saved=await account.request('/manage/products','POST',{id:editing?.product.id||null,version:editing?.version||null,product:p});editing=saved;if(file)await account.request(`/manage/products/${saved.product.id}/image`,'POST',{version:saved.version,image_data:await fileData(file)});$('#editor').close();await refresh();message('Товар сохранён в общей базе меню');}
  catch(e){$('#editor-error').textContent=e.message;}finally{submit.disabled=false;}
});
$('#archive').addEventListener('click',()=>{if(!confirm('Убрать товар из меню? Он останется в архиве и старых заказах.'))return;$('#product-form').elements.status.value='archived';$('#product-form').requestSubmit();});
function showCustomer(id){const c=data.customers.find(c=>c.id===id);if(!c){message('Клиент не входит в текущие 1000 карточек');return;}const orders=data.orders.filter(o=>o.user_id===id);const cart=data.carts.find(c=>c.user_id===id);$('#customer-content').innerHTML=`<h2>${esc(c.name)}</h2><p>${c.username?'@'+esc(c.username):'Без username'} · Telegram ID ${esc(c.tg_id)}</p><p class="muted">Первое обращение: ${date(c.created_at)}<br>Последняя активность аккаунта: ${date(c.updated_at)}</p><div class="cards"><div class="card">Демо-заказы<strong>${c.demo_order_count}</strong></div><div class="card">Демо-сумма<strong>${money(c.demo_order_total)}</strong></div><div class="card">Скидка<strong>${money(c.discount_balance)}</strong></div></div><div class="profile-history"><h2>Текущая корзина</h2>${cart?cart.items.map(i=>`<p>${esc(i.name)} × ${i.count}</p>`).join(''):'Корзина пуста'}<h2 style="margin-top:25px">История заказов</h2><p class="muted">Из последних 500 заказов системы.</p>${table(['Заказ','Клиент / канал','Состав','Сумма','Статус'],orderRows(orders))}</div>`;$('#customer').showModal();}
let confirmingOrder=null;
function showPurchaseConfirmation(id){
  const order=data?.orders.find(o=>o.id===id);
  if(!order||!['demo','pending','paid'].includes(order.status))return;
  confirmingOrder=id;
  const form=$('#purchase-confirmation-form');form.reset();
  $('#purchase-confirmation-title').textContent=`Покупка №${order.id.slice(0,8).toUpperCase()}`;
  $('#purchase-confirmation-summary').textContent=`${order.name} · ${money(order.total)} · ${order.items.map(i=>`${i.name} × ${i.count}`).join(', ')}`;
  $('#purchase-confirmation-error').textContent='';
  form.querySelector('[type=submit]').disabled=true;
  $('#purchase-confirmation').showModal();
}
$('#purchase-confirmation-form').addEventListener('change',e=>{
  const form=e.currentTarget;
  form.querySelector('[type=submit]').disabled=!(form.elements.paid.checked&&form.elements.fulfilled.checked);
});
$('#purchase-confirmation-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  if(!confirmingOrder||!form.elements.paid.checked||!form.elements.fulfilled.checked)return;
  const id=confirmingOrder;const submit=form.querySelector('[type=submit]');
  submit.disabled=true;submit.textContent='Подтверждаю…';
  form.elements.paid.disabled=true;form.elements.fulfilled.disabled=true;
  try{
    await account.request(`/manage/orders/${encodeURIComponent(id)}/confirm-purchase`,'POST',{paid:true,fulfilled:true});
    $('#purchase-confirmation').close();
    message('Покупка подтверждена. Клиент может оценить блюда из этого заказа.');
    await refresh();
  }catch(error){
    $('#purchase-confirmation-error').textContent=error.message;
    if(error.status===401){$('#purchase-confirmation').close();showLogin();}
  }finally{
    submit.disabled=false;submit.textContent='Подтвердить покупку';
    form.elements.paid.disabled=false;form.elements.fulfilled.disabled=false;
  }
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.confirmOrder){showPurchaseConfirmation(b.dataset.confirmOrder);return;}if(b.dataset.toggleProduct){b.dataset.instant=String(e.detail===0);void toggleProduct(Number(b.dataset.toggleProduct));return;}if(b.dataset.view){view=b.dataset.view;render();}if(b.dataset.edit&&!availability.pending.has(Number(b.dataset.edit)))editProduct(Number(b.dataset.edit));if(b.dataset.customer)showCustomer(Number(b.dataset.customer));if(b.hasAttribute('data-close'))b.closest('dialog').close();});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-toggle-product]');if(!b||b.disabled)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();b.dataset.instant='true';void toggleProduct(Number(b.dataset.toggleProduct),e.key==='ArrowRight');}});
$('#refresh').addEventListener('click',refresh);
$('#change-password').addEventListener('click',showPasswordChange);
$('#password-cancel').addEventListener('click',()=>{$('#password-form').reset();void refresh();});
$('#logout').addEventListener('click',async()=>{try{await account.logout();$('#password-form').reset();$('#login-form').reset();showLogin();$('#login-error').textContent='';}catch(e){message(e.message);}});
window.addEventListener('focus',()=>{if(account.token&&$('#password-change').hidden)void refresh();});
try{await account.connect();if(account.token)await refresh();}catch(e){showLogin();$('#login-error').textContent=e.message;}
setInterval(()=>{if(account.token&&!document.hidden&&!$('#editor').open&&!$('#purchase-confirmation').open&&$('#password-change').hidden)void refresh();},30000);
