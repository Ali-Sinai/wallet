package app.wallet.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.wallet.R
import app.wallet.ui.components.ErrorBox
import app.wallet.ui.components.Load
import app.wallet.ui.components.LoadingBox
import app.wallet.ui.components.TxRow
import app.wallet.ui.components.displayName
import app.wallet.ui.design.BareIconButton
import app.wallet.ui.design.BigNumber
import app.wallet.ui.design.DarkLabel
import app.wallet.ui.design.DirIcon
import app.wallet.ui.design.Dot
import app.wallet.ui.design.LineIcons
import app.wallet.ui.design.Mono
import app.wallet.ui.design.RoundButton
import app.wallet.ui.design.SectionHeader
import app.wallet.ui.design.SeeAll
import app.wallet.ui.design.SoftExpenseChip
import app.wallet.ui.design.StatChip
import app.wallet.ui.design.faint
import app.wallet.ui.design.gutter
import app.wallet.ui.design.softCard
import app.wallet.ui.design.track
import app.wallet.ui.theme.WalletColors
import app.wallet.util.Fmt
import java.time.LocalTime
import kotlin.math.abs

/* Wallet Dark.dc.html and Wallet Soft.dc.html home screens (designs/dark/DarkScreens.tsx, designs/soft/SoftScreens.tsx). */

/** Wallet Dark: a letter-spaced wordmark, the balance as a big thin number, four line-icon actions, today's list. */
@Composable
fun DarkHome(vm: HomeViewModel, actions: HomeActions, onSplitPicker: () -> Unit) {
    val p = WalletColors
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Row(
                Modifier.padding(start = gutter, end = gutter - 6.dp, top = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.app_name).uppercase(),
                    Modifier.weight(1f),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = track(0.2f),
                )
                BareIconButton(LineIcons.Search, stringResource(R.string.search), actions.seeAll, size = 20.dp)
                BareIconButton(LineIcons.Gear, stringResource(R.string.settings), actions.settings, size = 20.dp)
            }
        }
        when (val s = vm.state) {
            Load.Loading -> item { LoadingBox() }
            is Load.Failed -> item { ErrorBox(s.message, onRetry = vm::refresh) }
            is Load.Ready -> {
                val d = s.data
                item {
                    Column(Modifier.padding(horizontal = gutter).padding(top = 40.dp)) {
                        DarkLabel(stringResource(R.string.balance_toman))
                        BigNumber(Fmt.money(d.dashboard.netCents), Modifier.padding(top = 12.dp))
                        Row(Modifier.padding(top = 20.dp), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                            Row {
                                Text("+" + Fmt.short(d.dashboard.totalInCents), fontFamily = Mono, fontSize = 13.sp, color = p.income)
                                Text(" " + stringResource(R.string.income), fontSize = 13.sp, color = faint)
                            }
                            Row {
                                Text("−" + Fmt.short(d.dashboard.totalOutCents), fontFamily = Mono, fontSize = 13.sp, color = p.expense)
                                Text(" " + stringResource(R.string.expense), fontSize = 13.sp, color = faint)
                            }
                        }
                    }
                }
                item {
                    Row(Modifier.padding(horizontal = gutter).padding(top = 44.dp)) {
                        DarkAction(LineIcons.Plus, stringResource(R.string.add_short), actions.add, iconTint = p.accent)
                        DarkAction(LineIcons.Split, stringResource(R.string.split_short), onSplitPicker)
                        DarkAction(LineIcons.Sms, stringResource(R.string.sms_short), actions.openInbox, badge = d.pendingSms)
                        DarkAction(LineIcons.Chart, stringResource(R.string.tab_reports), actions.reports)
                    }
                }
                item {
                    SectionHeader(
                        stringResource(R.string.today_label),
                        Modifier.padding(horizontal = gutter).padding(top = 40.dp, bottom = 8.dp),
                    ) { SeeAll(stringResource(R.string.see_all), actions.seeAll) }
                }
                if (d.pendingSms > 0) {
                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable(onClick = actions.openInbox)
                                .padding(horizontal = gutter, vertical = 15.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(18.dp),
                        ) {
                            Dot(p.accent)
                            Text("${Fmt.digits(d.pendingSms)} ${stringResource(R.string.new_sms)}", Modifier.weight(1f), fontSize = 15.sp)
                            DirIcon(LineIcons.Chevron, 16.dp, p.foreground.copy(alpha = 0.3f))
                        }
                    }
                }
                items(d.recent, key = { it.id }) { tx -> TxRow(tx, d.lookups, onClick = { vm.selected = tx }) }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.DarkAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    onClick: () -> Unit,
    iconTint: Color = WalletColors.foreground,
    badge: Int = 0,
) {
    Column(
        Modifier
            .weight(1f)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, null, Modifier.size(24.dp), tint = iconTint)
        Row {
            Text(text, fontSize = 12.sp, color = WalletColors.foreground.copy(alpha = 0.67f))
            if (badge > 0) Text(" " + Fmt.digits(badge), fontSize = 12.sp, fontFamily = Mono, color = WalletColors.accent)
        }
    }
}

/** Wallet Soft: a greeting, the swipeable stack of bank cards, income/expense chips, the latest transactions. */
@Composable
fun SoftHome(vm: HomeViewModel, username: String, actions: HomeActions) {
    val p = WalletColors
    LazyColumn(Modifier.fillMaxSize()) {
        val pending = (vm.state as? Load.Ready<HomeData>)?.data?.pendingSms ?: 0
        item {
            Row(
                Modifier.padding(horizontal = gutter).padding(top = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    val hour = LocalTime.now(Fmt.TEHRAN).hour
                    Text(
                        stringResource(
                            when {
                                hour < 12 -> R.string.good_morning
                                hour < 18 -> R.string.good_afternoon
                                else -> R.string.good_evening
                            },
                        ),
                        fontSize = 12.sp,
                        color = faint,
                    )
                    Text(username, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
                RoundButton(LineIcons.Gear, stringResource(R.string.settings), actions.settings, size = 40.dp)
                RoundButton(LineIcons.Bell, stringResource(R.string.tab_inbox), actions.openInbox, badge = pending)
            }
        }
        when (val s = vm.state) {
            Load.Loading -> item { LoadingBox() }
            is Load.Failed -> item { ErrorBox(s.message, onRetry = vm::refresh) }
            is Load.Ready -> {
                val d = s.data
                item { CardStack(accountCards(d)) }
                item {
                    Row(
                        Modifier.padding(horizontal = gutter).padding(top = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        StatChip(
                            stringResource(R.string.income),
                            "+" + Fmt.short(d.dashboard.totalInCents),
                            p.income,
                            LineIcons.Up,
                            Modifier.weight(1f),
                        )
                        StatChip(
                            stringResource(R.string.expense),
                            "−" + Fmt.short(d.dashboard.totalOutCents),
                            SoftExpenseChip,
                            LineIcons.Down,
                            Modifier.weight(1f),
                        )
                    }
                }
                item {
                    SectionHeader(
                        stringResource(R.string.tab_activity),
                        Modifier.padding(start = gutter + 4.dp, end = gutter, top = 22.dp, bottom = 6.dp),
                    ) { SeeAll(stringResource(R.string.see_all), actions.seeAll) }
                }
                if (d.pendingSms > 0) {
                    item {
                        Row(
                            Modifier
                                .padding(horizontal = gutter, vertical = 6.dp)
                                .fillMaxWidth()
                                .softCard(p.surface)
                                .clickable(onClick = actions.openInbox)
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            Box(
                                Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(p.primary),
                                contentAlignment = Alignment.Center,
                            ) { Icon(LineIcons.Sms, null, Modifier.size(20.dp), tint = p.onPrimary) }
                            Text(
                                "${Fmt.digits(d.pendingSms)} ${stringResource(R.string.new_sms)}",
                                Modifier.weight(1f),
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            DirIcon(LineIcons.Chevron, 18.dp, faint)
                        }
                    }
                }
                items(d.recent.take(4), key = { it.id }) { tx -> TxRow(tx, d.lookups, onClick = { vm.selected = tx }) }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }
}

/** One bank card in Soft's stack. */
private class AccountCard(val key: String, val label: String, val balance: Long, val last4: String, val spentShare: Float)

/** Per-account all-time balances, led by an all-accounts card when there's more than one (useAccountCards). */
@Composable
private fun accountCards(d: HomeData): List<AccountCard> {
    val cards = d.accounts.map { r ->
        val flow = r.totalInCents + r.totalOutCents
        val account = d.lookups.account(r.accountId)
        AccountCard(
            key = r.accountId.toString(),
            label = account?.displayName() ?: r.label,
            balance = r.totalInCents - r.totalOutCents,
            last4 = account?.last4.orEmpty(),
            spentShare = if (flow > 0) r.totalOutCents.toFloat() / flow else 0f,
        )
    }
    val totalIn = d.accounts.sumOf { it.totalInCents }
    val totalOut = d.accounts.sumOf { it.totalOutCents }
    val total = AccountCard(
        key = "all",
        label = stringResource(R.string.all_accounts),
        balance = totalIn - totalOut,
        last4 = "",
        spentShare = if (totalIn + totalOut > 0) totalOut.toFloat() / (totalIn + totalOut) else 0f,
    )
    return when {
        cards.size > 1 -> listOf(total) + cards
        cards.isNotEmpty() -> cards
        else -> listOf(total)
    }
}

/** The swipeable card stack: swipe the top card away to bring the next one forward. */
@Composable
private fun CardStack(cards: List<AccountCard>) {
    val p = WalletColors
    val n = cards.size
    var current by remember(n) { mutableIntStateOf(0) }
    var dx by remember { mutableFloatStateOf(0f) }
    val threshold = with(LocalDensity.current) { 70.dp.toPx() }
    val fills = p.cardFills.ifEmpty { listOf(Color(0xFF1B1B1D)) }

    Box(
        Modifier
            .padding(horizontal = gutter)
            .padding(top = 22.dp)
            .fillMaxWidth()
            .height(212.dp)
            .pointerInput(n) {
                if (n < 2) return@pointerInput
                detectHorizontalDragGestures(
                    onDragEnd = {
                        if (abs(dx) > threshold) current = (current + 1) % n
                        dx = 0f
                    },
                    onDragCancel = { dx = 0f },
                ) { _, amount -> dx += amount }
            },
    ) {
        // Back cards first, so the top card draws over them.
        for (rel in (minOf(n, 3) - 1) downTo 0) {
            val i = (current + rel) % n
            val c = cards[i]
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(182.dp)
                    .graphicsLayer {
                        if (rel == 0) {
                            translationX = dx
                            rotationZ = dx / 22f
                            alpha = (1f - abs(dx) / 1000f).coerceIn(0.2f, 1f)
                        } else {
                            translationY = (rel * 14).dp.toPx()
                            scaleX = 1f - rel * 0.06f
                            scaleY = 1f - rel * 0.06f
                            transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f)
                            alpha = if (rel == 1) 0.75f else 0.45f
                        }
                    }
                    .shadow(10.dp, RoundedCornerShape(30.dp))
                    .clip(RoundedCornerShape(30.dp))
                    .background(fills[i % fills.size])
                    .drawBehind {
                        // The design's two decorative circles.
                        drawCircle(
                            Color.White.copy(alpha = 0.07f),
                            radius = 78.dp.toPx(),
                            center = Offset(size.width - 35.dp.toPx(), 25.dp.toPx()),
                            style = Stroke(34.dp.toPx()),
                        )
                        drawCircle(Color.White.copy(alpha = 0.05f), radius = 60.dp.toPx(), center = Offset(20.dp.toPx(), size.height))
                    }
                    .padding(horizontal = 24.dp, vertical = 22.dp),
            ) {
                Column(Modifier.fillMaxHeight()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(c.label, Modifier.weight(1f), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
                        Text(stringResource(R.string.toman), fontSize = 11.sp, color = Color.White.copy(alpha = 0.6f))
                    }
                    Text(Fmt.money(c.balance), Modifier.padding(top = 12.dp), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Box(
                        Modifier
                            .padding(top = 14.dp)
                            .fillMaxWidth()
                            .height(5.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color.White.copy(alpha = 0.15f)),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(c.spentShare.coerceIn(0f, 1f))
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(3.dp))
                                .background(p.cardBar),
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    // Card digits read left to right in both languages.
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        Text(
                            if (c.last4.isNotBlank()) "•••• ${Fmt.digits(c.last4)}" else "•••• ••••",
                            fontSize = 13.sp,
                            letterSpacing = 2.6.sp,
                            color = Color.White.copy(alpha = 0.75f),
                        )
                    }
                }
            }
        }
    }
    if (n > 1) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        ) {
            cards.forEachIndexed { i, _ ->
                Box(
                    Modifier
                        .height(6.dp)
                        .width(if (i == current) 20.dp else 6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (i == current) p.primary else p.ink.copy(alpha = 0.18f))
                        .clickable { current = i },
                )
            }
        }
    }
}
